/* WP AI Ultra Optimizer Admin JS */
document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss notices
    setTimeout(function() {
        var notices = document.querySelectorAll('.wpai-notice');
        notices.forEach(function(n) { n.style.opacity = '0'; n.style.transition = 'opacity .5s'; });
    }, 5000);
});
