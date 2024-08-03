(function() {
    var iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '300px';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '9999';

    // This placeholder will be replaced at build time
    iframe.src = '%%WIDGET_URL%%';

    document.body.appendChild(iframe);
})();