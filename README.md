# PhotoSwipe Slideshow plugin


This plugin adds slideshow button to the UI to [PhotoSwipe 5](https://github.com/dimsemenov/PhotoSwipe) 

## Using the plugin

To use the plugin, import the module and create the plugin using the lightbox instance as parameter before you init the lightbox.

```
<script type="module">
import PhotoSwipeLightbox from 'photoswipe/dist/photoswipe-lightbox.esm.min.js';
import PhotoSwipeSlideshow from 'photoswipe-fullscreen/photoswipe-slideshow.esm.js';

const lightbox = new PhotoSwipeLightbox({
  gallerySelector: '#gallery',
  childSelector: '.pswp-gallery__item',
  pswpModule: () => import('photoswipe/dist/photoswipe.esm.js'),
});

const slideshowPlugin = new PhotoSwipeSlideshow(lightbox,4000); //4 sec
lightbox.init();
</script>
```
