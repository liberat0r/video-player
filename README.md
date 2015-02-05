Video Player
============

A JQuery plugin that loads and plays HTML5 videos

__Attributes__
- [data-video-play-when-in-view] only play when the video is in the viewport
- [data-video-preload] preload before starting playback
- [data-video-fade-in] apply a fade in effect
- [data-video-bind-scroll] bind the window scroll and the video seeking
- [data-video-volume] set the initial volume
- [data-video-size] 'cover' or 'contain' emulation

__Example__

```
<video class="js-video-player"
	autoplay="autoplay"
	loop="loop"
	data-video-play-when-in-view="true"
	data-video-preload="true"
	data-video-fade-in="false"
	data-video-bind-scroll="false"
	data-video-volume="0"
	data-video-size="cover">
	<source src="1.mp4" type="video/mp4">
</video>
```

Note: [Asset Async Load](https://github.com/liberat0r/asset-async-load) can be used to control the source of the video.
