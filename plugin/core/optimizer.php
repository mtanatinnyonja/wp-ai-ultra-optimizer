<?php
defined('ABSPATH') || exit;

class WPAI_Optimizer {

    public static function init(): void {
        add_action('wp_head', [__CLASS__, 'inject_delay_js_config'], 2);
        add_filter('the_content', [__CLASS__, 'optimize_content_images']);
    }

    public static function inject_delay_js_config(): void {
        $opts    = get_option('wpai_settings', []);
        $exclude = json_encode($opts['defer_exclude'] ?? ['jquery', 'wc-', 'elementor']);
        echo "<script>window.WPAI={delayExclude:{$exclude}};</script>\n";
    }

    public static function optimize_content_images(string $content): string {
        // Add fetchpriority=high to first image in content
        $count = 0;
        $content = preg_replace_callback('/<img([^>]+)>/i', function ($m) use (&$count) {
            $count++;
            if ($count === 1) {
                return '<img' . $m[1] . ' fetchpriority="high">';
            }
            return $m[0];
        }, $content);
        return $content;
    }
}
