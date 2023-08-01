/*! Slideshow plugin for PhotoSwipe v5.  https://github.com/dpet23/photoswipe-slideshow */

class PhotoSwipeSlideshow {

    /**
     * Set up PhotoSwipe lightbox event binds.
     *
     * @param {PhotoSwipeLightbox} lightbox PhotoSwipe lightbox instance.
     * @param {Number} time                 Slideshow delay in seconds.
     */
    constructor(lightbox, time) {
        // Add custom CSS for the progress bar.
        document.head.insertAdjacentHTML(
            'beforeend',
            '<style>.pswp__timer{height:3px;background:#c00;width:0;position:fixed;bottom:0}.load .pswp__timer{width:100%}</style>',
        );

        // Set default parameters.
        this.wakeLockState = false;
        this.wakeLockSentinel = null;
        this.state = -1; // <0 (undefined) // ==0 (paused) // >0 (running)
        this.slideshowTimerID = 0;
        this.time = Number(localStorage.getItem('pswptime'));
        this.time = this.time > 0 ? this.time : time ? time : 4;
        this.lightbox = lightbox;

        // Set up lightbox and gallery event binds.
        this.lightbox.on('init', () => {
            this.init(this.lightbox.pswp);
        });
    }

    /**
     * Set up event binds for the PhotoSwipe lightbox and gallery.
     *
     * @param {PhotoSwipeCore} pswp PhotoSwipe instance.
     */
    init(pswp) {

        // Add UI elements to an open gallery.
        pswp.on('uiRegister', () => {
            // Add a button to the PhotoSwipe UI for toggling the slideshow state.
            pswp.ui.registerElement({
                name: 'playpause-button', // pswp__button--playpause-button
                title: 'Play [Space] Time +/-',
                order: 18, // default: counter=5, image=7, zoom=10, info=15, close=20
                isButton: true,
                html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32"><use class="pswp__icn-shadow" xlink:href="#pswp__icn-pause"/><use class="pswp__icn-shadow" xlink:href="#pswp__icn-play"/><path id="pswp__icn-play" d="M7.4 25 25 16 7.4 6.6Z" /><path id="pswp__icn-pause" style="display:none" d="m7 7h4l0 18h-4zm14 0h4v18h-4z"/></svg>',
                onClick: (event, el) => {
                    this.player();
                },
            });

            // Add a wrapper for the progress bar.
            pswp.ui.registerElement({
                name: 'playtime',
                className: 'pswp__time',
                appendTo: 'wrapper',
            });

            // Add custom keyboard bindings.
            pswp.events.add(document, 'keydown', e => {
                const k = e.keyCode;
                if (k == 32) {  // Space
                    this.player();
                    e.preventDefault();
                }
                if (k == 38 || k == 107 || k == 187) {  // ArrowUp || NumpadAdd || Equal
                    this.timer(1);
                }
                if (k == 40 || k == 109 || k == 189) {  // ArrowDown || NumpadSubtract || Minus
                    this.timer(-1);
                }
            });
        });

        // Close the slideshow when closing PhotoSwipe.
        this.lightbox.on('close', () => {
            if (this.state > 0) {
                this.player();
            }
        });
    }

    /**
     * Define the slideshow state and start/stop the slideshow.
     */
    player() {
        if (this.state < 0) {
            setTimeout(() => {
                this.setSlideshowState();
            }, 600);
            this.state = 0;
        } else {
            this.setSlideshowState();
        }
    }

    /**
     * Toggle the slideshow state and switch the button's icon.
     */
    setSlideshowState() {
        // Invert the slideshow state.
        this.state = this.state ? 0 : 1;

        if (this.state) {
            // Starting the slideshow: go to next slide after some wait time.
            this.timer();
        } else {
            // Stopping the slideshow: reset the progress bar and timer.
            this.toggleProgressBar(0);
            clearTimeout(this.slideshowTimerID);
            this.slideshowTimerID = null;
        }

        // Update icon to reflect the slideshow state.
        document.querySelector('#pswp__icn-pause').style.display = this.state ? 'inline' : 'none';
        document.querySelector('#pswp__icn-play').style.display = this.state ? 'none' : 'inline';

        // Toggle wake lock: prevent/allow the screen to turn off.
        this.toggleWakeLock(this.state);
    }

    /**
     * Manage the slideshow timer.
     *
     * @param {Number | undefined} lengthDelta Amount to change the slideshow length.
     */
    timer(lengthDelta) {
        // Reset the current timer progress.
        this.toggleProgressBar(0);
        if (this.slideshowTimerID) {
            clearTimeout(this.slideshowTimerID);
            this.slideshowTimerID = null;
        }

        // Don't restart the timer if the slideshow isn't running.
        if (this.state < 1) {
            return;
        }

        // Change the slideshow length.
        if (lengthDelta) {
            // Save the updated slideshow length.
            this.time = Math.max(1, this.time + lengthDelta);
            localStorage.setItem('pswptime', this.time);

            // Show the current slideshow length.
            const slideCounterElement = document.querySelector('.pswp__counter');
            if (slideCounterElement) {
                slideCounterElement.innerHTML = this.time + 's';
            }
        }

        if (pswp.currSlide.content.isLoading()) {
            this.slideshowTimerID = setTimeout(() => {this.timer()}, 200);
        } else {
            // Start the slideshow timer and go to the next slide.
            this.slideshowTimerID = setTimeout(() => {this.timer()}, this.time * 1000);
            if (!lengthDelta) {
                pswp.next();
            }
            this.toggleProgressBar(2);
        }
    }

    /**
     * Show or hide the slideshow progress bar.
     *
     * @param {Number | undefined} code Functionality: 2==start, 1==running, 0==stop.
     */
    toggleProgressBar(code) {
        const slideshowProgressBarWrapper = document.querySelector('.pswp__time');
        if (code) {
            if (code == 2) {
                slideshowProgressBarWrapper.innerHTML = `<div class="pswp__timer" style="transition:width ${this.time}s;"/>`;
                setTimeout(() => {this.toggleProgressBar(1)}, 100);
                return;
            }
            slideshowProgressBarWrapper.classList.add('load');
        } else {
            slideshowProgressBarWrapper.innerHTML = '';
            slideshowProgressBarWrapper.classList.remove('load');
        }
    }

    /**
     * Set wake lock if supported by the browser.
     * https://caniuse.com/wake-lock
     *
     * @param {Number} state Requested wake lock state: 1==on, 0==off
     */
    toggleWakeLock(state) {
        if (this.wakeLockState == state) {
            return;
        }

        if ('keepAwake' in screen) {
            // Use experimental API for older browsers.
            // This is a simple boolean flag.
            screen.keepAwake = state;
        } else if ('wakeLock' in navigator) {
            // Use the Screen Wake Lock API for newer browsers.

            if (this.wakeLockSentinel) {
                // Release screen wake lock, if a request was previously successful.
                this.wakeLockSentinel.release().then(() => {
                    this.wakeLockSentinel = null;
                });
            } else {
                // Request screen wake lock.
                navigator.wakeLock
                    .request('screen')
                    .then(sentinel => {
                        // Save the reference for the wake lock.
                        this.wakeLockSentinel = sentinel;

                        // Update our state if the wake lock happens to be released by the browser.
                        this.wakeLockSentinel.addEventListener('release', () => {
                            this.wakeLockSentinel = null;
                            this.wakeLockState = false;
                        });
                    })
                    .catch(e => {}); // ignore errors if wake lock request fails.
            }
        }

        this.wakeLockState = state;
    }
}

export default PhotoSwipeSlideshow;
