<?php defined('ABSPATH') || exit; ?>
<div class="wrap" id="wpai-dashboard">
<style>
.wpai-wrap{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1100px}
.wpai-header{background:linear-gradient(135deg,#0f1923 0%,#1a2d40 100%);color:#fff;padding:24px 32px;border-radius:12px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
.wpai-header h1{margin:0;font-size:26px;font-weight:700}
.wpai-badge{background:#00d4ff;color:#0f1923;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase}
.wpai-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.wpai-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.05)}
.wpai-card .num{font-size:32px;font-weight:800;color:#0f1923}
.wpai-card .lbl{color:#64748b;font-size:13px;margin-top:4px}
.wpai-btn{display:inline-block;padding:10px 20px;border-radius:8px;font-weight:600;text-decoration:none;border:none;cursor:pointer;font-size:14px}
.wpai-btn-primary{background:#0f1923;color:#fff}.wpai-btn-danger{background:#ef4444;color:#fff}.wpai-btn-success{background:#10b981;color:#fff}
.wpai-actions{display:flex;gap:12px;flex-wrap:wrap}
.wpai-notice{padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:14px}
.wpai-notice.success{background:#d1fae5;color:#065f46;border-left:4px solid #10b981}
.wpai-notice.info{background:#dbeafe;color:#1e3a8a;border-left:4px solid #3b82f6}
</style>
<?php if (!empty($_GET['wpai'])): ?>
<div class="wpai-notice success"><?php $msgs=['flushed'=>'Cache cleared!','saved'=>'Saved.'];echo esc_html($msgs[$_GET['wpai']]??'Done.'); ?></div>
<?php endif; ?>
<div class="wpai-wrap">
  <div class="wpai-header">
    <span style="font-size:36px">⚡</span>
    <div><h1>WP AI Ultra Optimizer</h1><p style="margin:4px 0 0;opacity:.7">v5.0.0 — <?php echo esc_html(home_url()); ?></p></div>
    <span class="wpai-badge"><?php echo esc_html(strtoupper($plan)); ?></span>
  </div>
  <div class="wpai-cards">
    <div class="wpai-card"><div class="num"><?php echo esc_html($cache); ?></div><div class="lbl">Cache Size</div></div>
    <div class="wpai-card"><div class="num"><?php echo esc_html(strtoupper($plan)); ?></div><div class="lbl">Plan</div></div>
    <div class="wpai-card"><div class="num"><?php echo esc_html($info['expires']?:'∞'); ?></div><div class="lbl">Expires</div></div>
  </div>
  <div class="wpai-actions">
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>"><?php wp_nonce_field('wpai_flush_cache'); ?><input type="hidden" name="action" value="wpai_flush_cache"><button class="wpai-btn wpai-btn-danger" type="submit">🗑 Clear Cache</button></form>
    <a class="wpai-btn wpai-btn-primary" href="<?php echo esc_url(admin_url('admin.php?page=wpai-settings')); ?>">⚙️ Settings</a>
    <a class="wpai-btn wpai-btn-success" href="<?php echo esc_url(admin_url('admin.php?page=wpai-license')); ?>">🔑 License</a>
  </div>
  <?php if ($plan==='free'): ?><div class="wpai-notice info" style="margin-top:20px">🚀 <strong>Upgrade to PRO</strong> to unlock Critical CSS, AI Optimization & more. <a href="https://wp-ai-optimizer.com/pricing" target="_blank">View Plans →</a></div><?php endif; ?>
</div></div>
