import { NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
  'http://localhost:8000/api/v1';
const PIM_API_URL = process.env.PIM_API_PRIVATE_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 },
      );
    }

    // Build payload: if password provided, it's a change password; otherwise, it's a reset request
    const payload: { username: string; password?: string } = { username };
    if (password) {
      payload.password = password;
    }

    const response = await fetch(`${API_BASE}/wrapper/reset_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Handle ERP response
    if (data.ReturnCode !== undefined && data.ReturnCode !== 0) {
      return NextResponse.json(
        { success: false, message: data.Message || 'Operation failed' },
        { status: 400 },
      );
    }

    // Server-to-server: Send forgot password email with temp password
    // ERP returns: { success: true, message: { new_password: '...', username: '...' } }
    const tempPassword = data.TempPassword || data.message?.new_password;

    if (!password && tempPassword) {
      const emailPayload = {
        toEmail: username,
        email: username,
        tempPassword: tempPassword,
        ragioneSociale:
          data.RagioneSociale || data.message?.ragioneSociale || '',
        contactName: data.ContactName || data.message?.contactName || '',
      };

      try {
        const emailResponse = await fetch(
          `${PIM_API_URL}/api/b2b/emails/forgot-password`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          },
        );
        await emailResponse.json();
      } catch (emailError) {
        console.error('[reset-password] Email send failed:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        data.Message ||
        (password ? 'Password changed successfully' : 'Reset email sent'),
    });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 },
    );
  }
}
