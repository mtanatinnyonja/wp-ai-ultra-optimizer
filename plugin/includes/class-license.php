<?php
defined('ABSPATH') || exit;

class WPAI_License {

    private static string $option_key = 'wpai_license_data';

    public static function get_plan(): string {
        $data = self::get_cached_data();
        if (empty($data) || !$data['valid']) return 'free';
        if (!empty($data['expires']) && strtotime($data['expires']) < time()) return 'free';
        return $data['plan'] ?? 'free';
    }

    public static function is_valid(): bool {
        return self::get_plan() !== 'free';
    }

    public static function activate(string $key): array {
        $key = sanitize_text_field($key);
        if (empty($key)) return ['success' => false, 'message' => 'Empty license key.'];

        $response = wp_remote_post(WPAI_API . '/license/validate', [
            'timeout' => 15,
            'body'    => [
                'license_key' => $key,
                'site_url'    => home_url(),
            ],
        ]);

        if (is_wp_error($response)) {
            return ['success' => false, 'message' => $response->get_error_message()];
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (!empty($body['valid'])) {
            $data = [
                'key'     => $key,
                'valid'   => true,
                'plan'    => sanitize_text_field($body['plan'] ?? 'free'),
                'expires' => sanitize_text_field($body['expires'] ?? ''),
                'cached'  => time(),
            ];
            update_option(self::$option_key, $data);
            return ['success' => true, 'plan' => $data['plan']];
        }

        return ['success' => false, 'message' => $body['message'] ?? 'Invalid license.'];
    }

    public static function deactivate(): void {
        delete_option(self::$option_key);
    }

    private static function get_cached_data(): array {
        $data = get_option(self::$option_key, []);
        if (empty($data)) return [];

        // Re-validate every 24h
        if (!empty($data['cached']) && (time() - $data['cached']) > DAY_IN_SECONDS) {
            $fresh = self::activate($data['key']);
            if (!$fresh['success']) return [];
            $data = get_option(self::$option_key, []);
        }

        return $data;
    }

    public static function get_key(): string {
        $data = get_option(self::$option_key, []);
        return $data['key'] ?? '';
    }

    public static function get_info(): array {
        $data = get_option(self::$option_key, []);
        return [
            'plan'    => $data['plan']    ?? 'free',
            'expires' => $data['expires'] ?? 'N/A',
            'valid'   => !empty($data['valid']),
            'key'     => !empty($data['key']) ? substr($data['key'], 0, 4) . str_repeat('*', 12) : '',
        ];
    }
}
