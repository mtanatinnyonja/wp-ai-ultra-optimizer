<?php
defined('ABSPATH') || exit;

class WPAI_API {

    public static function analyze_url(string $url): array {
        $response = wp_remote_post(WPAI_API . '/optimize/analyze', [
            'timeout' => 20,
            'headers' => ['X-WPAI-Key' => get_option('wpai_license_data')['key'] ?? ''],
            'body'    => ['url' => esc_url_raw($url), 'site' => home_url()],
        ]);

        if (is_wp_error($response)) return ['error' => $response->get_error_message()];
        return json_decode(wp_remote_retrieve_body($response), true) ?? [];
    }

    public static function generate_critical_css(string $url): string {
        $response = wp_remote_post(WPAI_API . '/critical-css', [
            'timeout' => 45,
            'headers' => ['X-WPAI-Key' => get_option('wpai_license_data')['key'] ?? ''],
            'body'    => ['url' => esc_url_raw($url)],
        ]);

        if (is_wp_error($response)) return '';
        $body = json_decode(wp_remote_retrieve_body($response), true);
        return wp_strip_all_tags($body['css'] ?? '');
    }
}
