import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { vincApi, VincApiError } from '@/lib/vinc-api';

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

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: 'Non autenticato' },
        { status: 401 },
      );
    }

    // Call VINC API to change password (validates current password and changes it)
    await vincApi.auth.changePassword(authToken, currentPassword, password);

    // Send confirmation email via PIM API
    const emailPayload = {
      toEmail: username,
      email: username,
      ragioneSociale: '',
      contactName: '',
    };

    try {
      await fetch(`${PIM_API_URL}/api/b2b/emails/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });
    } catch (emailError) {
      console.error('[change-password] Email send failed:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Password cambiata con successo',
    });
  } catch (error) {
    console.error('[change-password] Error:', error);

    if (error instanceof VincApiError) {
      const status = error.status === 401 ? 401 : 400;

      // Map error messages to translated versions
      let message = 'Cambio password fallito';
      if (error.status === 401) {
        message = 'La password attuale non è corretta';
      } else if (error.status === 422) {
        // Validation error - check for password length
        if (
          error.detail?.includes('at least') ||
          error.detail?.includes('min_length')
        ) {
          message = 'La nuova password deve essere di almeno 4 caratteri';
        } else {
          message = 'Dati non validi. Controlla i campi inseriti';
        }
      } else if (error.detail) {
        message = error.detail;
      }

      return NextResponse.json({ success: false, message }, { status });
    }

    return NextResponse.json(
      { success: false, message: 'Si è verificato un errore' },
      { status: 500 },
    );
  }
}
