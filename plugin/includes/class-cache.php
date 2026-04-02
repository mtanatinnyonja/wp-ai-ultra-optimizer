<?php
defined('ABSPATH') || exit;

class WPAI_Cache {

    private static string $cache_dir = WP_CONTENT_DIR . '/cache/wpai/';

    public static function init(): void {
        if (is_admin() || self::should_bypass()) return;
        add_action('template_redirect', [__CLASS__, 'serve_or_create'], 1);
        add_action('save_post',         [__CLASS__, 'flush_post_cache']);
        add_action('wp_trash_post',     [__CLASS__, 'flush_post_cache']);
        add_action('comment_post',      [__CLASS__, 'flush_all']);
    }

    public static function create_cache_dir(): void {
        if (!file_exists(self::$cache_dir)) {
            wp_mkdir_p(self::$cache_dir);
            file_put_contents(self::$cache_dir . '.htaccess', 'Deny from all');
        }
    }

    public static function serve_or_create(): void {
        $file = self::get_cache_file();

        if (file_exists($file) && (time() - filemtime($file)) < self::get_ttl()) {
            header('X-WPAI-Cache: HIT');
            header('Content-Type: text/html; charset=UTF-8');
            readfile($file);
            exit;
        }

        ob_start([__CLASS__, 'save_output']);
    }

    public static function save_output(string $buffer): string {
        if (strlen($buffer) < 255) return $buffer;

        $file = self::get_cache_file();
        $dir  = dirname($file);

        if (!file_exists($dir)) wp_mkdir_p($dir);

        $comment = "\n<!-- WPAI Cache: " . gmdate('Y-m-d H:i:s') . " -->";
        file_put_contents($file, $buffer . $comment);
        header('X-WPAI-Cache: MISS');

        return $buffer;
    }

    public static function flush_all(): void {
        self::rrmdir(self::$cache_dir);
        self::create_cache_dir();
    }

    public static function flush_post_cache(int $post_id): void {
        $url  = get_permalink($post_id);
        $file = self::url_to_file($url);
        if (file_exists($file)) unlink($file);
    }

    private static function should_bypass(): bool {
        if (is_user_logged_in())       return true;
        if (isset($_COOKIE['woocommerce_cart_hash'])) return true;
        if (isset($_COOKIE['wp_woocommerce_session_'])) return true;
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') return true;
        if (!empty($_GET)) return true;
        return false;
    }

    private static function get_cache_file(): string {
        $url  = (is_ssl() ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
        return self::url_to_file($url);
    }

    private static function url_to_file(string $url): string {
        $path = rtrim(parse_url($url, PHP_URL_PATH), '/');
        return self::$cache_dir . md5($url) . '/index.html';
    }

    private static function get_ttl(): int {
        return (int) get_option('wpai_cache_ttl', 3600);
    }

    private static function rrmdir(string $dir): void {
        if (!is_dir($dir)) return;
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? self::rrmdir($path) : unlink($path);
        }
    }

    public static function get_size(): string {
        $size = 0;
        if (!is_dir(self::$cache_dir)) return '0 KB';
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(self::$cache_dir)) as $file) {
            $size += $file->getSize();
        }
        return round($size / 1024, 1) . ' KB';
    }
}
