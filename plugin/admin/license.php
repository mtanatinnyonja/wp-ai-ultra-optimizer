<?php defined('ABSPATH') || exit; ?>
<div class="wrap"><h1>🔑 License</h1>
<?php if (!empty($_GET['wpai'])): $msgs=['activated'=>['success','License activated!'],'deactivated'=>['warning','License deactivated.'],'error'=>['error','Invalid key.']]; $m=$msgs[$_GET['wpai']]??['info','Done.']; ?><div class="notice notice-<?php echo $m[0]; ?> is-dismissible"><p><?php echo $m[1]; ?></p></div><?php endif; ?>
<table class="form-table">
<tr><th>Status</th><td><?php echo $info['valid']?'<b style="color:green">✅ Active</b>':'<b style="color:#999">❌ FREE</b>'; ?></td></tr>
<tr><th>Plan</th><td><b><?php echo esc_html(strtoupper($info['plan'])); ?></b></td></tr>
<tr><th>Key</th><td><?php echo esc_html($info['key']?:'—'); ?></td></tr>
<tr><th>Expires</th><td><?php echo esc_html($info['expires']?:'N/A'); ?></td></tr>
</table>
<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
<?php wp_nonce_field('wpai_license_action'); ?><input type="hidden" name="action" value="wpai_activate_license">
<table class="form-table"><tr><th><label for="lk">License Key</label></th><td><input type="text" id="lk" name="license_key" size="50" placeholder="XXXX-XXXX-XXXX-XXXX"></td></tr></table>
<?php submit_button('Activate'); ?>
</form>
<?php if ($info['valid']): ?>
<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
<?php wp_nonce_field('wpai_license_action'); ?><input type="hidden" name="action" value="wpai_deactivate_license">
<?php submit_button('Deactivate','delete','','',['onclick'=>"return confirm('Deactivate?')"]); ?>
</form><?php endif; ?>
</div>
