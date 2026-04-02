<?php
defined('ABSPATH') || exit;

class WPAI_Assets {

    private static string $plan = 'free';

    public static function init(string $plan): void {
        self::$plan = $plan;
        add_action('wp_head',   [__CLASS__, 'output_head'],   1);
        add_action('wp_footer', [__CLASS__, 'output_footer'], 99);
        add_filter('script_loader_tag', [__CLASS__, 'defer_scripts'], 10, 3);
        add_filter('wp_get_attachment_image_attributes', [__CLASS__, 'lazyload_images']);
        remove_action('wp_head', 'print_emoji_detection_script', 7);
        remove_action('wp_print_styles', 'print_emoji_styles');
        remove_action('wp_head', 'wp_generator');
        remove_action('wp_head', 'wp_shortlink_wp_head');
        remove_action('wp_head', 'rsd_link');
        add_filter('embed_oembed_html', '__return_false');
    }

    public static function output_head(): void {
        $opts = get_option('wpai_settings', []);

        // Preconnect for fonts
        if (!empty($opts['preconnect_gfonts'])) {
            echo '<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>' . "\n";
            echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
        }

        // PRO: Critical CSS injection
        if (in_array(self::$plan, ['pro', 'agency']) && !empty($opts['critical_css_enabled'])) {
            $critical = get_option('wpai_critical_css_' . get_queried_object_id(), '');
            if ($critical) {
                echo '<style id="wpai-critical">' . wp_strip_all_tags($critical) . '</style>' . "\n";
            }
        }

        // PRO: Preload LCP image
        if (in_array(self::$plan, ['pro', 'agency']) && !empty($opts['lcp_preload_url'])) {
            $url = esc_url($opts['lcp_preload_url']);
            echo "<link rel='preload' as='image' href='{$url}' fetchpriority='high'>\n";
        }

        // PRO: Speculation Rules
        if (in_array(self::$plan, ['pro', 'agency']) && !empty($opts['speculation_rules'])) {
            echo '<script type="speculationrules">{"prefetch":[{"source":"document","eagerness":"moderate"}]}</script>' . "\n";
        }
    }

    public static function output_footer(): void {
        // PRO: Delay JS loader
        if (in_array(self::$plan, ['pro', 'agency'])) {
            echo '<script>document.addEventListener("DOMContentLoaded",function(){var e=document.querySelectorAll("[data-wpai-src]");e.forEach(function(t){t.src=t.getAttribute("data-wpai-src")})});</script>' . "\n";
        }
    }

    public static function defer_scripts(string $tag, string $handle, string $src): string {
        $opts     = get_option('wpai_settings', []);
        $excluded = $opts['defer_exclude'] ?? ['jquery'];

        foreach ($excluded as $ex) {
            if (strpos($handle, $ex) !== false) return $tag;
        }

        if (!is_admin() && strpos($tag, 'defer') === false) {
            return str_replace(' src=', ' defer src=', $tag);
        }

        return $tag;
    }

    public static function lazyload_images(array $attr): array {
        if (isset($attr['class']) && strpos($attr['class'], 'skip-lazy') !== false) return $attr;
        $attr['loading'] = 'lazy';
        $attr['decoding'] = 'async';
        return $attr;
    }
}
