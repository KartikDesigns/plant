(function() {
    // Guard: only init if EmailJS SDK is loaded
    if (typeof emailjs !== 'undefined' && emailjs.init) {
        emailjs.init({
            publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' // Replace with your EmailJS public key
        });
    } else {
        console.warn('EmailJS SDK not loaded — email features unavailable');
    }
})();
