<?php
defined('ABSPATH') || exit;

class WPAI_Admin {

    public static function init(): void {
        add_action('admin_menu',        [__CLASS__, 'add_menu']);
        add_action('admin_init',        [__CLASS__, 'register_settings']);
        add_action('admin_post_wpai_activate_license',   [__CLASS__, 'handle_license_activate']);
        add_action('admin_post_wpai_deactivate_license', [__CLASS__, 'handle_license_deactivate']);
        add_action('admin_post_wpai_flush_cache',        [__CLASS__, 'handle_flush_cache']);
        add_action('admin_post_wpai_save_settings',      [__CLASS__, 'handle_save_settings']);
    }

    public static function add_menu(): void {
        add_menu_page(
            'WP AI Ultra Optimizer',
            'AI Optimizer',
            'manage_options',
            'wpai-optimizer',
            [__CLASS__, 'render_dashboard'],
            'dashicons-performance',
            81
        );
        add_submenu_page('wpai-optimizer', 'Settings', 'Settings', 'manage_options', 'wpai-settings', [__CLASS__, 'render_settings']);
        add_submenu_page('wpai-optimizer', 'License',  'License',  'manage_options', 'wpai-license',  [__CLASS__, 'render_license']);
    }

    public static function register_settings(): void {
        register_setting('wpai_settings_group', 'wpai_settings', ['sanitize_callback' => [__CLASS__, 'sanitize_settings']]);
    }

    public static function sanitize_settings(array $input): array {
        $clean = [];
        $bools = ['defer_js','lazyload','critical_css_enabled','preconnect_gfonts','lcp_preload','speculation_rules','remove_emoji','remove_embeds'];
        foreach ($bools as $k) {
            $clean[$k] = !empty($input[$k]);
        }
        $clean['cache_ttl']      = absint($input['cache_ttl'] ?? 3600);
        $clean['lcp_preload_url'] = esc_url_raw($input['lcp_preload_url'] ?? '');
        $clean['defer_exclude']  = array_map('sanitize_text_field', explode(',', $input['defer_exclude'] ?? 'jquery'));
        return $clean;
    }

    public static function render_dashboard(): void {
        if (!current_user_can('manage_options')) wp_die('Forbidden');
        $info  = WPAI_License::get_info();
        $plan  = $info['plan'];
        $cache = WPAI_Cache::get_size();
        require_once WPAI_PATH . 'admin/dashboard.php';
    }

    public static function render_settings(): void {
        if (!current_user_can('manage_options')) wp_die('Forbidden');
        $opts = get_option('wpai_settings', []);
        require_once WPAI_PATH . 'admin/settings.php';
    }

    public static function render_license(): void {
        if (!current_user_can('manage_options')) wp_die('Forbidden');
        $info = WPAI_License::get_info();
        require_once WPAI_PATH . 'admin/license.php';
    }

    public static function handle_license_activate(): void {
        if (!current_user_can('manage_options') || !check_admin_referer('wpai_license_action')) wp_die('Forbidden');
        $key    = sanitize_text_field($_POST['license_key'] ?? '');
        $result = WPAI_License::activate($key);
        $msg    = $result['success'] ? 'activated' : 'error';
        wp_redirect(admin_url('admin.php?page=wpai-license&wpai=' . $msg));
        exit;
    }

    public static function handle_license_deactivate(): void {
        if (!current_user_can('manage_options') || !check_admin_referer('wpai_license_action')) wp_die('Forbidden');
        WPAI_License::deactivate();
        wp_redirect(admin_url('admin.php?page=wpai-license&wpai=deactivated'));
        exit;
    }

    public static function handle_flush_cache(): void {
        if (!current_user_can('manage_options') || !check_admin_referer('wpai_flush_cache')) wp_die('Forbidden');
        WPAI_Cache::flush_all();
        wp_redirect(admin_url('admin.php?page=wpai-optimizer&wpai=flushed'));
        exit;
    }

    public static function handle_save_settings(): void {
        if (!current_user_can('manage_options') || !check_admin_referer('wpai_save_settings')) wp_die('Forbidden');
        $input = $_POST['wpai_settings'] ?? [];
        update_option('wpai_settings', self::sanitize_settings($input));
        wp_redirect(admin_url('admin.php?page=wpai-settings&wpai=saved'));
        exit;
    }
}
