// Transactional email via Resend. Mirrors stripe.service.js's lazy-client
// pattern, but email is never a hard dependency - sendEmail() never throws.
// With no RESEND_API_KEY set, it logs the rendered email to the console
// instead of sending (dev-stub mode, same idea as the Step 10 password-reset
// flow), so every flow is fully testable with zero external setup. Callers
// (order.service.js) fire these without awaiting into the response path, so
// a Resend outage can never fail an order/checkout request.

let resendClient = null;
let resendClientAttempted = false;

function getResendClient() {
  if (resendClientAttempted) return resendClient;
  resendClientAttempted = true;

  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  // eslint-disable-next-line global-require
  const { Resend } = require('resend');
  resendClient = new Resend(key);
  return resendClient;
}

async function sendEmail({ to, subject, html }) {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || 'Burney Boyz <onboarding@resend.dev>';

  if (!client) {
    console.log(`[Email:DEV] to=${to} subject="${subject}" - RESEND_API_KEY not set, not sent.`);
    console.log(html);
    return;
  }

  try {
    await client.emails.send({ from, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message || err);
  }
}

function money(value) {
  const n = Number(value);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

// Shared shell so every email looks consistent - simple, table-based,
// inline-styled markup for broad email-client compatibility.
function layout({ heading, intro, body }) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f6f4; padding:32px 16px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eee;">
        <div style="background:#111827; padding:24px 32px;">
          <span style="color:#ffffff; font-size:18px; font-weight:bold;">Burney Boyz</span>
        </div>
        <div style="padding:32px;">
          <h1 style="margin:0 0 12px; font-size:20px; color:#111827;">${heading}</h1>
          ${intro ? `<p style="margin:0 0 20px; color:#4b5563; font-size:14px; line-height:1.6;">${intro}</p>` : ''}
          ${body}
        </div>
        <div style="padding:20px 32px; background:#f9fafb; color:#9ca3af; font-size:12px;">
          Burney Boyz - this is an automated message about your order.
        </div>
      </div>
    </div>
  `;
}

function itemsTable(items, subtotal) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0; font-size:13px; color:#111827;">
            ${item.name}${item.variantLabel ? ` <span style="color:#9ca3af;">(${item.variantLabel})</span>` : ''}
            <span style="color:#9ca3af;"> × ${item.quantity}</span>
          </td>
          <td style="padding:8px 0; font-size:13px; color:#111827; text-align:right;">${money(item.lineTotal)}</td>
        </tr>`,
    )
    .join('');

  return `
    <table style="width:100%; border-collapse:collapse; margin:16px 0; border-top:1px solid #eee;">
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%; border-collapse:collapse; border-top:1px solid #eee; padding-top:8px;">
      <tr>
        <td style="padding-top:8px; font-size:13px; color:#4b5563;">Subtotal</td>
        <td style="padding-top:8px; font-size:13px; color:#4b5563; text-align:right;">${money(subtotal)}</td>
      </tr>
    </table>
  `;
}

function shippingAddressBlock(order) {
  return `${order.shippingFullName}, ${order.shippingAddressLine1}${
    order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ''
  }, ${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}, ${order.shippingCountry}`;
}

function orderConfirmationEmail(order) {
  return {
    subject: `Order Confirmed - ${order.orderNumber}`,
    html: layout({
      heading: "We've received your order!",
      intro: `Thanks for shopping with Burney Boyz. Your order <strong>${order.orderNumber}</strong> has been received and is being processed.`,
      body: `
        ${itemsTable(order.items, order.subtotal)}
        <table style="width:100%; margin-top:8px;">
          <tr><td style="font-size:15px; font-weight:bold; padding-top:8px;">Total</td>
              <td style="font-size:15px; font-weight:bold; padding-top:8px; text-align:right;">${money(order.total)}</td></tr>
        </table>
        <p style="margin-top:24px; font-size:13px; color:#4b5563;">
          <strong>Shipping to:</strong><br/>${shippingAddressBlock(order)}
        </p>
      `,
    }),
  };
}

function paymentSuccessEmail(order) {
  return {
    subject: `Payment Received - ${order.orderNumber}`,
    html: layout({
      heading: 'Payment successful',
      intro: `We've received your payment for order <strong>${order.orderNumber}</strong>. Here's your receipt.`,
      body: `
        ${itemsTable(order.items, order.subtotal)}
        <table style="width:100%; margin-top:8px;">
          <tr><td style="font-size:13px; color:#4b5563;">Shipping (${order.shippingMethodLabel})</td>
              <td style="font-size:13px; color:#4b5563; text-align:right;">${money(order.shippingCost)}</td></tr>
          <tr><td style="font-size:15px; font-weight:bold; padding-top:8px;">Total paid</td>
              <td style="font-size:15px; font-weight:bold; padding-top:8px; text-align:right;">${money(order.total)}</td></tr>
        </table>
      `,
    }),
  };
}

function shippingPlaceholderEmail(order) {
  return {
    subject: `Your Order Has Shipped - ${order.orderNumber}`,
    html: layout({
      heading: 'Your order is on its way!',
      intro: `Order <strong>${order.orderNumber}</strong> has shipped.`,
      body: `
        <p style="font-size:13px; color:#4b5563; line-height:1.6;">
          Tracking details will be added here once carrier integration is available.
          In the meantime, you can view your order any time from your account.
        </p>
        <p style="margin-top:16px; font-size:13px; color:#4b5563;">
          <strong>Shipping to:</strong><br/>${shippingAddressBlock(order)}
        </p>
      `,
    }),
  };
}

function adminNewOrderEmail(order) {
  return {
    subject: `New Order - ${order.orderNumber} (${money(order.total)})`,
    html: layout({
      heading: 'New order received',
      intro: `${order.customerName || order.customerEmail} (${order.customerEmail}) just placed order <strong>${order.orderNumber}</strong>.`,
      body: `
        ${itemsTable(order.items, order.subtotal)}
        <table style="width:100%; margin-top:8px;">
          <tr><td style="font-size:15px; font-weight:bold; padding-top:8px;">Total</td>
              <td style="font-size:15px; font-weight:bold; padding-top:8px; text-align:right;">${money(order.total)}</td></tr>
        </table>
        <p style="margin-top:16px; font-size:13px; color:#4b5563;">Status: <strong>${order.status}</strong></p>
      `,
    }),
  };
}

/**
 * Fires the two "order was just created" emails - customer confirmation and
 * admin notification. If the order is already paid (the Stripe-checkout
 * creation path always is), also fires the payment-success receipt.
 * Fire-and-forget: never awaited by callers into the response path.
 */
async function notifyOrderCreated(order) {
  const confirmation = orderConfirmationEmail(order);
  await sendEmail({ to: order.customerEmail, ...confirmation });

  const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminTo) {
    const adminEmail = adminNewOrderEmail(order);
    await sendEmail({ to: adminTo, ...adminEmail });
  }

  if (order.status === 'paid') {
    const receipt = paymentSuccessEmail(order);
    await sendEmail({ to: order.customerEmail, ...receipt });
  }
}

/**
 * Fires the status-transition emails an admin status change can trigger.
 * Fire-and-forget: never awaited by callers into the response path.
 */
async function notifyOrderStatusChanged(order, previousStatus) {
  if (order.status === previousStatus) return;

  if (order.status === 'paid') {
    const receipt = paymentSuccessEmail(order);
    await sendEmail({ to: order.customerEmail, ...receipt });
  }

  if (order.status === 'shipped') {
    const shipping = shippingPlaceholderEmail(order);
    await sendEmail({ to: order.customerEmail, ...shipping });
  }
}

/**
 * Retries an async operation a fixed number of times with exponential backoff.
 * Used for sendEmail() so a transient Resend failure doesn't permanently lose
 * a transactional message. Errors are still caught & logged - retries never
 * surface to callers.
 */
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;

async function retry(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await fn();
      return; // success
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const ms = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`[Email:${label}] Retry ${attempt + 1}/${MAX_RETRIES} after ${ms}ms - ${err.message || err}`);
        await new Promise((r) => setTimeout(r, ms));
      }
    }
  }
  // All attempts exhausted - log as permanent failure
  console.error(`[Email:${label}] Failed after ${MAX_RETRIES + 1} attempts:`, lastErr?.message || lastErr);
}

async function sendEmail({ to, subject, html }) {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || 'Burney Boyz <onboarding@resend.dev>';

  if (!client) {
    console.log(`[Email:DEV] to=${to} subject="${subject}" - RESEND_API_KEY not set, not sent.`);
    console.log(html);
    return;
  }

  await retry(() => sendEmailOnce({ from, to, subject, html }), 'send');
}

async function sendEmailOnce({ from, to, subject, html }) {
  const client = getResendClient();
  await client.emails.send({ from, to, subject, html });
  console.log(`[Email] Sent "${subject}" to ${to}`);
}

// --- Welcome Email ---

function welcomeEmail(user) {
  const firstName = user?.firstName || '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  return {
    subject: 'Welcome to Burney Boyz!',
    html: layout({
      heading: "You're in!",
      intro: `${greeting} Your account is all set up. Start shopping the latest trending products right away.`,
      body: `
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:24px;">🎉</p>
          <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">
            Browse our full catalog and discover gadgets, home essentials, beauty favorites, fashion, fitness gear, and more.
          </p>
        </div>
        <p style="margin-top:20px;font-size:13px;color:#4b5563;">
          If you have any questions, feel free to reach out at <a href="mailto:support@burneyboyz.com" style="color:#3b82f6;text-decoration:none;">support@burneyboyz.com</a>.
        </p>
      `,
    }),
  };
}

// --- Password Reset Email ---

function passwordResetEmail(user, resetUrl) {
  const firstName = user?.firstName || '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';

  return {
    subject: 'Reset your Burney Boyz password',
    html: layout({
      heading: 'Password reset request',
      intro: `${greeting} We received a request to reset your password. Click the button below to create a new one. This link expires in 30 minutes.`,
      body: `
        <div style="text-align:center;margin-top:20px;">
          <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Reset Password</a>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#9ca3af;text-align:center;">
          If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <p style="margin-top:8px;font-size:12px;color:#9ca3af;text-align:center;">
          If the button above doesn't work, copy and paste this link into your browser:<br/>
          <span style="word-break:break-all;color:#6b7280;">${resetUrl}</span>
        </p>
      `,
    }),
  };
}

// --- Admin Access Requests (Sprint 10 / Step 26) ---

function requesterName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

// Sent to ADMIN_NOTIFICATION_EMAIL when someone requests admin access.
function adminAccessRequestedEmail(requester) {
  return {
    subject: `New Admin Access Request - ${requesterName(requester)}`,
    html: layout({
      heading: 'New admin access request',
      intro: `<strong>${requesterName(requester)}</strong> (${requester.email}) has requested access to the admin panel.`,
      body: `
        <p style="font-size:13px;color:#4b5563;line-height:1.6;">
          Log into the admin panel and open <strong>Access Requests</strong> to approve or decline this
          request.
        </p>
      `,
    }),
  };
}

// Sent to the requester once their own request is submitted.
function adminAccessReceivedEmail(requester) {
  const greeting = requester.firstName ? `Hi ${requester.firstName},` : 'Hi there,';
  return {
    subject: 'Your admin access request was received',
    html: layout({
      heading: 'Request received',
      intro: `${greeting} Your request for admin access to Burney Boyz has been sent to the site owner for review. You'll get another email once it's decided.`,
      body: '',
    }),
  };
}

function adminAccessApprovedEmail(user) {
  const greeting = user.firstName ? `Hi ${user.firstName},` : 'Hi there,';
  return {
    subject: 'Your admin access was approved',
    html: layout({
      heading: "You're approved!",
      intro: `${greeting} Your admin access request has been approved. Log in with the same email and password you registered with.`,
      body: '',
    }),
  };
}

function adminAccessDeclinedEmail(user) {
  const greeting = user.firstName ? `Hi ${user.firstName},` : 'Hi there,';
  return {
    subject: 'Your admin access request was declined',
    html: layout({
      heading: 'Request declined',
      intro: `${greeting} Your request for admin access to Burney Boyz was not approved.`,
      body: '',
    }),
  };
}

// Fire-and-forget, same pattern as notifyOrderCreated - a Resend hiccup must
// never fail the registration request.
function notifyAdminAccessRequested(requester) {
  const received = adminAccessReceivedEmail(requester);
  sendEmail({ to: requester.email, ...received }).catch(() => {});

  const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminTo) {
    const notice = adminAccessRequestedEmail(requester);
    sendEmail({ to: adminTo, ...notice }).catch(() => {});
  }
}

function notifyAdminAccessDecided(user, approved) {
  const email = approved ? adminAccessApprovedEmail(user) : adminAccessDeclinedEmail(user);
  sendEmail({ to: user.email, ...email }).catch(() => {});
}

module.exports = {
  sendEmail,
  orderConfirmationEmail,
  paymentSuccessEmail,
  shippingPlaceholderEmail,
  adminNewOrderEmail,
  welcomeEmail,
  passwordResetEmail,
  notifyOrderCreated,
  notifyOrderStatusChanged,
  notifyAdminAccessRequested,
  notifyAdminAccessDecided,
};
