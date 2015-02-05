/**
 * HTML5 Video Player
 *
 * Loads and plays HTML5 videos. It has the following features:
 *
 * - Play a video only when a part of it is in view. Use the attribute
 *   data-video-play-when-in-view="true" also keep in mind that the
 *   starting state of the video needs to be playing, for instance
 *   by setting autplay="autoplay"
 *
 * - Preload the video and start playing only if the video has loaded
 *   completely, the loading is faster than the playback or for some
 *   reason the loading has stopped. Use the attribute data-video-preload="true"
 *   for that.
 *
 * - To fade in the video, use the attribute data-video-fade-in="false".
 *
 * - To bind the window scroll on the video seek, use data-video-bind-scroll="true".
 *
 * - Set the initial volume of a video with data-video-volume="0".
 *
 * - You can emulate "cover" of "contain" behavior with data-video-size="cover" or
 *   data-video-size="contain" respectively
 *
 * Markup example:
 *
 *   <video class="a-video js-video-player"
 *       autoplay="autoplay"
 *       loop="loop"
 *       data-video-play-when-in-view="true"
 *       data-video-preload="true"
 *       data-video-fade-in="false"
 *       data-video-bind-scroll="false"
 *       data-video-volume="0"
 *       data-video-size="cover">
 *      <source data-asset-async-src-video-source="1.mp4" type="video/mp4">
 *   </video>
 *
 * In this case, asset async load was used to determine the source of the video. For
 * a more simple implementation the following source could be used:
 *
 *   <source src="1.mp4" type="video/mp4">
 *
 */


(function(name, definition) {
	var theModule = definition(),
	// this is considered "safe":
		hasDefine = typeof define === "function" && define.amd,
	// hasDefine = typeof define === "function",
		hasExports = typeof module !== "undefined" && module.exports;

	if (hasDefine) { // AMD Module
		define(theModule);
	} else if (hasExports) { // Node.js Module
		module.exports = theModule;
	} else { // Assign to common namespaces or simply the global object (window)
		( this.jQuery || this.ender || this.$ || this)[name] = theModule;
	}

	// Start
	theModule.init();

})("VideoPlayer", function() {
	var module = this;

	// Private Variables

	// JQuery Objects
	module.$document = $(document);
	module.$window = $(window);
	module.$videoElement = $(".js-video-player"); // All video elements should have this class
	module.$scrollBoundVideos = $("[data-video-bind-scroll='true']"); // Videos that are bound to page scroll
	module.$playWhenInViewVideos = $("[data-video-play-when-in-view='true']"); // Videos that start playing when in view
	module.$centeredVideos = $("[data-video-size]"); // Videos that need to be centered on resize

	module.videoCache = []; // Saves data about the videos here

	module.scrollVideoInterval = 50; // Refresh seek position every x ms

	// Private Methods

	// Video preloading has been completed
	module.videoPreloadComplete = function($el) {
		"use strict";

		var domVideo = $el.get(0);
		var videoID = $el.attr('data-video-id');

		window.clearTimeout(module.videoCache[videoID].progressStuckTimer);
		module.videoCache[videoID].videoLoadedPercent = 100;
		domVideo.currentTime = 0;
		module.videoCache[videoID].videoLoaded = true;
	};

	// Preload video
	module.preloadVideo = function($el, callback) {
		"use strict";

		var domVideo = $el.get(0);
		var videoID = $el.attr('data-video-id');

		domVideo.load();
		module.videoCache[videoID].previousPreloadPercent = -1;
		module.videoCache[videoID].videoLoaded = false;

		domVideo.addEventListener("progress", function() {

			var videoID = $(this).attr('data-video-id');

			if (this.duration && !module.videoCache[videoID].videoLoaded) {

				module.videoCache[videoID].videoLoadedPercent = (this.buffered.end(0) / this.duration) * 100;
				// 'video preloading: ' + module.videoCache[videoID].videoLoadedPercent
				this.currentTime++;

				module.videoCache[videoID].videoPreloadProgress = true;
				// todo: video loading bar element
				//self.$videoLoader.stop().animate({height: self.videoLoadedPercent + '%'}, 300);

				if (module.videoCache[videoID].previousPreloadPercent !== module.videoCache[videoID].videoLoadedPercent) {
					window.clearTimeout(module.videoCache[videoID].progressStuckTimer);
				}

				module.videoCache[videoID].progressStuckTimer = setTimeout(function() {
					// force playback start

					if (module.videoCache[videoID].previousPreloadPercent === module.videoCache[videoID].videoLoadedPercent &&
						module.videoCache[videoID].videoLoadedPercent !== 100) {
						// forcing video start because of late loading

						module.videoPreloadComplete($(this));
						callback($(this));
					}

				}, 1000);


				module.videoCache[videoID].previousPreloadPercent = module.videoCache[videoID].videoLoadedPercent;

				if (module.videoCache[videoID].videoLoadedPercent == 100) {
					// video loading completed start playback

					module.videoPreloadComplete($(this));
					callback($(this));
				}

				// Check if preloading is fast enough to start playing
				if ((this.buffered.end(0) - module.videoCache[videoID].previousVideoLoadTime) < ((Date.now() / 1000) - module.videoCache[videoID].previousVideoTime)) {
					// forcing video start because of fast loading

					module.videoPreloadComplete($(this));
					callback($(this));
				} else {
					// update values
					module.videoCache[videoID].previousVideoTime = Date.now() / 1000;
					module.videoCache[videoID].previousVideoLoadTime = this.buffered.end(0);
				}

			}

		}, false);

	};

	// Update video time with the seek time set
	// in the videdoCache array. Probably set from
	// the module.scrollRecalculate function
	module.updateVideoTime = function($el) {
		"use strict";

		var domVideo = $el.get(0);

		domVideo.currentTime = module.videoCache[$el.attr('data-video-id')].currentVideoPosition;
	};

	// Recalculate the video seek position when it
	// is bound to page scroll
	module.scrollRecalculate = function($el) {
		"use strict";

		var domVideo = $el.get(0);
		var maxVideoTime = domVideo.seekable.end(0);
		var maxparentHeight = module.$document.height() - module.$window.height();
		var currentScrollPosition = module.$window.scrollTop();

		domVideo.pause();
		module.videoCache[$el.attr('data-video-id')].currentVideoPosition = (currentScrollPosition / maxparentHeight) * maxVideoTime;
	};

	// Use margins to center the video elements
	// options to emulate 'contain' or 'cover'
	module.centerVideoMargins = function($el, center) {
		"use strict";

		var parentHeight = $el.parent().height();
		var parentWidth = $el.parent().width();
		var videoHeight = $el.height();
		var videoWidth = $el.width();

		switch (center) {
			case 'contain':
				var widthDifference = parentWidth / videoWidth;
				var heightDifference = parentHeight / videoHeight;

				if (widthDifference < heightDifference) {

					$el.css({
						width : parentWidth,
						height: 'auto'
					});

				} else {

					$el.css({
						width : 'auto',
						height: parentHeight
					});

				}

				break;

			case 'cover':
				$el.css({
					'min-width' : '100%',
					'min-height': '100%',
					width       : 'auto',
					height      : 'auto'
				});

				videoHeight = $el.height();
				videoWidth = $el.width();

				if (parentHeight < videoHeight) {
					$el.css({
						'margin-top': -Math.abs((videoHeight - parentHeight) / 2)
					});
				} else {
					$el.css({
						'margin-top': 0
					});
				}

				if (parentWidth < videoWidth) {
					$el.css({
						'margin-left': -Math.abs((videoWidth - parentWidth) / 2)
					});
				} else {
					$el.css({
						'margin-left': 0
					});
				}

				break;

			default:
				break;
		}
	};


	return {

		// Public Variables

		// Public Methods

		// Check sizing and fix margins
		resizeAdjust : function() {
			"use strict";

			module.$videoElement.each(function() {
				if (typeof $(this).attr('data-video-size') !== 'undefined') {
					module.centerVideoMargins($(this), $(this).attr('data-video-size'));
				}
			});
		},

		// After the video is loaded init
		afterLoadInit: function($el) {
			"use strict";

			var domVideo = $el.get(0);

			// Init volume
			domVideo.volume = 0;

			// Set fade to 0 if the video is to be faded in on load
			if (typeof $el.attr('data-video-fade-in') !== 'undefined' &&
				$el.attr('data-video-fade-in') === 'true') {
				$el.fadeTo(0, 0);
			}

			// If volume data attrinute was set, apply the setting
			if (typeof $el.attr('data-video-volume') !== 'undefined') {
				domVideo.volume = $el.attr('data-video-volume');
			}

			// Show the first frame of the video every time is
			// finishes playback
			if (!domVideo.loop) {

				// Bind on end event
				domVideo.onended = function(e) {
					this.currentTime = 0;
					this.pause();
				};
			}

			// Bind click to toggle play or pause
			$el.click(function(e) {
				e.preventDefault();

				if (this.paused) {
					this.play();
				} else {
					this.pause();
				}
			});

			if (typeof $el.attr('data-video-fade-in') !== 'undefined' &&
				$el.attr('data-video-fade-in') == 'true') {
				// Video fade in
				$el.show();
				$el.fadeTo(1500, 1);
			} else {
				// Just show the video
				$el.show();
			}
		},

		// Check videos in view
		videosInView : function() {
			"use strict";

			console.log(module.videoCache);

			// Check if these videos are in viewport
			module.$playWhenInViewVideos.each(function() {

				var domVideo = $(this).get(0);
				var videoID = $(this).attr('data-video-id');

				var videoTop;
				var videoLeft;
				var videoHeight;
				var videoWidth;

				// Determine the video's initial state
				if (typeof module.videoCache[videoID].startingState === 'undefined') {
					if (typeof $(this).attr('autoplay') !== 'undefined') {
						module.videoCache[videoID].startingState = 'play';
					} else {
						module.videoCache[videoID].startingState = 'pause';
					}
				}

				if (typeof $(this).attr("data-video-size") !== 'undefined' &&
					$(this).attr("data-video-size") === 'cover') {
					// Get the values from the parent because the video
					// is probably overflowing
					var $videoParent = $(this).parent();

					videoTop = $videoParent.get(0).offsetTop;
					videoLeft = $videoParent.get(0).offsetLeft;
					videoHeight = $videoParent.height();
					videoWidth = $videoParent.width();
				} else {
					// Get the actual video's offsets
					videoTop = this.offsetTop;
					videoLeft = this.offsetLeft;
					videoHeight = $(this).height();
					videoWidth = $(this).width();
				}

				// Check if any part of the video is visible
				if (videoTop < (window.pageYOffset + window.innerHeight) &&
					videoLeft < (window.pageXOffset + window.innerWidth) &&
					(videoTop + videoHeight) > window.pageYOffset &&
					(videoLeft + videoWidth) > window.pageXOffset) {

					if (module.videoCache[videoID].startingState === 'play') {
						domVideo.play();
					}

				} else {
					domVideo.pause();
				}

			});
		},

		// Initialize Plugin
		init         : function() {
			"use strict";

			if (module.$videoElement.length > 0) {

				var videoIDCounter = 0;

				module.$videoElement.each(function() {

					// Add a unique identifier attribute to each video
					$(this).attr('data-video-id', videoIDCounter);
					// Init the cache object for this video
					module.videoCache[videoIDCounter] = {};

					if (typeof $(this).attr('data-video-preload') !== 'undefined' &&
						$(this).attr('data-video-preload') === 'true') {
						// Video is set to smart preload

						$(this).hide();

						// Set init video timestamp and load time will be
						// used to establish if playback can start
						module.videoCache[videoIDCounter].previousVideoTimestamp = Date.now() / 1000;
						module.videoCache[videoIDCounter].previousVideoLoadTime = 0;

						// Start the preload iteration
						module.preloadVideo($(this), function($el) {

							$.VideoPlayer.afterLoadInit($el);
							$.VideoPlayer.resizeAdjust();

							if (module.$playWhenInViewVideos.length > 0) {
								$.VideoPlayer.videosInView();
							}

						});

					} else {
						// Normal init
						$.VideoPlayer.afterLoadInit($(this));
					}

					videoIDCounter++;
				});

				// If videos need to be centered bind
				// the appropriate events
				if (module.$centeredVideos.length > 0) {
					// Bind event on loaded metadata which means
					// we now have the actual video size and can
					// calculate center
					module.$centeredVideos.each(function() {
						var domVideo = $(this).get(0);

						domVideo.addEventListener("loadedmetadata", function() {
							$.VideoPlayer.resizeAdjust();

							if (module.$playWhenInViewVideos.length > 0) {
								$.VideoPlayer.videosInView();
							}
						}, false);
					});

					// Bind on window resize
					module.$window.resize(function() {
						$.VideoPlayer.resizeAdjust();
					});
				}

				// If data-video-bind-scroll bind video seek
				// to page scroll
				if (module.$scrollBoundVideos.length > 0) {
					// Init
					module.$scrollBoundVideos.each(function() {
						module.scrollRecalculate($(this));
					});

					// Bind event to window scroll
					module.$window.on('scroll', function() {
						module.$scrollBoundVideos.each(function() {
							module.scrollRecalculate($(this));
						});
					});

					// Set the interval
					module.timerRecalculate = setInterval(function() {
						module.$scrollBoundVideos.each(function() {
							module.updateVideoTime($(this));
						});
					}, module.scrollVideoInterval);
				}

				// If videos are to be played when in view
				if (module.$playWhenInViewVideos.length > 0) {
					module.$window.on('scroll', function() {
						$.VideoPlayer.videosInView();
					});

					module.$window.resize(function() {
						$.VideoPlayer.videosInView();
					});
				}

			}

		}

	};


});