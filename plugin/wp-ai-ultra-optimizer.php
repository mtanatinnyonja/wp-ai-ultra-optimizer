<?php
/**
 * Plugin Name: WP AI Ultra Optimizer
 * Plugin URI:  https://wp-ai-optimizer.com
 * Description: AI-powered performance optimizer. Cache, Critical CSS, Lazy Load, JS delay & more.
 * Version:     1.0.0
 * Author:      WP AI Ultra Team
 * License:     GPL-2.0+
 * Text Domain: wpai
 * Requires PHP: 8.0
 * Requires at least: 6.4
 */

defined('ABSPATH') || exit;

define('WPAI_VERSION', '1.0.0');
define('WPAI_URL',     plugin_dir_url(__FILE__));
define('WPAI_PATH',    plugin_dir_path(__FILE__));
define('WPAI_API',     'https://your-saas.com/api');

require_once WPAI_PATH . 'includes/class-license.php';
require_once WPAI_PATH . 'includes/class-cache.php';
require_once WPAI_PATH . 'includes/class-assets.php';
require_once WPAI_PATH . 'includes/class-api.php';
require_once WPAI_PATH . 'includes/class-admin.php';

register_activation_hook(__FILE__,   ['WPAI_Cache', 'create_cache_dir']);
register_deactivation_hook(__FILE__, ['WPAI_Cache', 'flush_all']);

add_action('plugins_loaded', function () {
    WPAI_Admin::init();

    $plan = WPAI_License::get_plan(); // 'free' | 'pro' | 'agency'

    WPAI_Cache::init();
    WPAI_Assets::init($plan);

    if (in_array($plan, ['pro', 'agency'], true)) {
        require_once WPAI_PATH . 'core/optimizer.php';
        require_once WPAI_PATH . 'core/performance.php';
        WPAI_Optimizer::init();
        WPAI_Performance::init();
    }
});
