import { NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_B2B_PUBLIC_REST_API_ENDPOINT ||
  'http://localhost:8000/api/v1';
const PIM_API_URL = process.env.PIM_API_PRIVATE_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, currentPassword, password } = body;

    if (!username || !currentPassword || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username, current password, and new password are required',
        },
        { status: 400 },
      );
    }

    // Step 1: Validate current password by attempting login
    const loginResponse = await fetch(`${API_BASE}/wrapper/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password: currentPassword }),
    });

    const loginData = await loginResponse.json();

    // Check if login failed:
    // - HTTP status not ok (e.g., 422)
    // - ReturnCode exists and is not 0
    // - success field is explicitly false
    const loginFailed =
      !loginResponse.ok ||
      (loginData.ReturnCode !== undefined && loginData.ReturnCode !== 0) ||
      loginData.success === false;

    if (loginFailed) {
      return NextResponse.json(
        { success: false, message: 'La password attuale non è corretta' },
        { status: 401 },
      );
    }

    // Step 2: Change password
    const changeResponse = await fetch(`${API_BASE}/wrapper/reset_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const changeData = await changeResponse.json();

    if (changeData.ReturnCode !== undefined && changeData.ReturnCode !== 0) {
      return NextResponse.json(
        {
          success: false,
          message: changeData.Message || 'Cambio password fallito',
        },
        { status: 400 },
      );
    }

    // Step 3: Send confirmation email
    const emailPayload = {
      toEmail: username,
      email: username,
      ragioneSociale: loginData.message?.company_name || '',
      contactName: loginData.message?.client?.Nome || '',
    };

    try {
      const emailResponse = await fetch(
        `${PIM_API_URL}/api/b2b/emails/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        },
      );
      await emailResponse.json();
    } catch (emailError) {
      console.error('[change-password] Email send failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: changeData.Message || 'Password cambiata con successo',
    });
  } catch (error) {
    console.error('[change-password] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Si è verificato un errore' },
      { status: 500 },
    );
  }
}
