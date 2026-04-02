<?php defined('ABSPATH') || exit; ?>
<div class="wrap"><h1>⚙️ Settings</h1>
<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
<?php wp_nonce_field('wpai_save_settings'); ?><input type="hidden" name="action" value="wpai_save_settings">
<table class="form-table">
<tr><th>Cache TTL (s)</th><td><input type="number" name="wpai_settings[cache_ttl]" value="<?php echo esc_attr($opts['cache_ttl']??3600); ?>" min="60"></td></tr>
<tr><th>Lazy Load</th><td><label><input type="checkbox" name="wpai_settings[lazyload]" <?php checked(!empty($opts['lazyload'])); ?>> Images & iframes</label></td></tr>
<tr><th>Defer JS</th><td><label><input type="checkbox" name="wpai_settings[defer_js]" <?php checked(!empty($opts['defer_js'])); ?>> Defer non-critical scripts</label></td></tr>
<tr><th>Exclude from Defer</th><td><input type="text" name="wpai_settings[defer_exclude]" value="<?php echo esc_attr(implode(',',$opts['defer_exclude']??['jquery'])); ?>" size="50"><p class="description">Comma-separated handles.</p></td></tr>
<tr><th>Remove Emoji</th><td><label><input type="checkbox" name="wpai_settings[remove_emoji]" <?php checked(!empty($opts['remove_emoji'])); ?>> Remove WP emoji scripts</label></td></tr>
<tr><th>Preconnect Fonts</th><td><label><input type="checkbox" name="wpai_settings[preconnect_gfonts]" <?php checked(!empty($opts['preconnect_gfonts'])); ?>> Google Fonts preconnect</label></td></tr>
<tr><th colspan="2"><hr><strong>PRO Features</strong></th></tr>
<tr><th>Critical CSS</th><td><label><input type="checkbox" name="wpai_settings[critical_css_enabled]" <?php checked(!empty($opts['critical_css_enabled'])); ?>> Inject critical CSS (PRO)</label></td></tr>
<tr><th>LCP Image URL</th><td><input type="url" name="wpai_settings[lcp_preload_url]" value="<?php echo esc_attr($opts['lcp_preload_url']??''); ?>" size="60" placeholder="https://..."><p class="description">PRO: Preload your hero image.</p></td></tr>
<tr><th>Speculation Rules</th><td><label><input type="checkbox" name="wpai_settings[speculation_rules]" <?php checked(!empty($opts['speculation_rules'])); ?>> Prefetch on hover (PRO, Chrome 109+)</label></td></tr>
</table>
<?php submit_button('Save Settings'); ?>
</form></div>
