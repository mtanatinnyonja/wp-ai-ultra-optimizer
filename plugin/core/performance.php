<?php
defined('ABSPATH') || exit;

class WPAI_Performance {

    public static function init(): void {
        add_action('wp_head',                 [__CLASS__, 'resource_hints'], 1);
        add_action('wp_ajax_wpai_gen_critical', [__CLASS__, 'ajax_generate_critical']);
        add_filter('style_loader_tag',        [__CLASS__, 'async_non_critical_css'], 10, 4);
    }

    public static function resource_hints(): void {
        echo "<link rel='dns-prefetch' href='//fonts.googleapis.com'>\n";
        echo "<link rel='dns-prefetch' href='//ajax.googleapis.com'>\n";
    }

    public static function ajax_generate_critical(): void {
        check_ajax_referer('wpai_generate_critical');
        if (!current_user_can('manage_options')) wp_die('Forbidden');

        $url = esc_url_raw($_POST['url'] ?? home_url());
        $css = WPAI_API::generate_critical_css($url);

        if ($css) {
            update_option('wpai_critical_css_' . sanitize_key(parse_url($url, PHP_URL_PATH)), $css);
            wp_send_json_success(['css_length' => strlen($css)]);
        }

        wp_send_json_error('Failed to generate critical CSS.');
    }

    public static function async_non_critical_css(string $html, string $handle, string $href, string $media): string {
        $opts     = get_option('wpai_settings', []);
        $critical = !empty($opts['critical_css_enabled']);
        $excluded = ['dashicons', 'admin', 'login', 'wpai'];

        if (!$critical) return $html;
        foreach ($excluded as $ex) {
            if (strpos($handle, $ex) !== false) return $html;
        }

        // Load async, fallback via noscript
        return "<link rel='preload' as='style' href='{$href}' onload=\"this.onload=null;this.rel='stylesheet'\">\n" .
               "<noscript>{$html}</noscript>\n";
    }
}
