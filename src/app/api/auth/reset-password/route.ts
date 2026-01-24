import { NextRequest, NextResponse } from 'next/server';
import { vincApi, VincApiError, getVincApiForTenant } from '@/lib/vinc-api';
import { resolveTenant, isMultiTenant } from '@/lib/tenant';
import * as crypto from 'crypto';

/**
 * Generate a secure random password
 * Similar to VINC API's generate_random_password function
 */
function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = lowercase + uppercase + digits + special;

  // Ensure at least one of each type
  let password =
    lowercase[crypto.randomInt(lowercase.length)] +
    uppercase[crypto.randomInt(uppercase.length)] +
    digits[crypto.randomInt(digits.length)] +
    special[crypto.randomInt(special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle the password
  const shuffled = password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');

  return shuffled;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 },
      );
    }

    // Get VINC API client and PIM URL (multi-tenant aware)
    let api = vincApi;
    let pimApiUrl = process.env.PIM_API_URL || 'http://localhost:3001';

    if (isMultiTenant) {
      const hostname =
        request.headers.get('x-tenant-hostname') ||
        request.headers.get('host') ||
        'localhost';
      const tenant = await resolveTenant(hostname);

      if (!tenant) {
        console.error('[reset-password] Tenant not found for hostname:', hostname);
        return NextResponse.json(
          { success: false, message: 'Tenant not found' },
          { status: 404 },
        );
      }

      api = getVincApiForTenant({ projectCode: tenant.projectCode });
      pimApiUrl = tenant.api.pimApiUrl;
    }

    // Determine the password to set
    let passwordToSet = password;
    let tempPassword: string | null = null;

    // If no password provided, generate a temporary one (forgot password flow)
    if (!password) {
      tempPassword = generateSecurePassword(12);
      passwordToSet = tempPassword;
    }

    // Call VINC API to set the password
    await api.auth.setPasswordByEmail(username, passwordToSet);

    // Send forgot password email with temp password via PIM API
    if (tempPassword) {
      const emailPayload = {
        toEmail: username,
        email: username,
        tempPassword: tempPassword,
        ragioneSociale: '',
        contactName: '',
      };

      try {
        await fetch(`${pimApiUrl}/api/b2b/emails/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });
      } catch (emailError) {
        console.error('[reset-password] Email send failed:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: password
        ? 'Password cambiata con successo'
        : 'Email di recupero inviata',
    });
  } catch (error) {
    console.error('[reset-password] Error:', error);

    if (error instanceof VincApiError) {
      // User not found or other API error
      if (error.status === 404) {
        return NextResponse.json(
          { success: false, message: 'Utente non trovato' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { success: false, message: error.detail || 'Operazione fallita' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Si è verificato un errore' },
      { status: 500 },
    );
  }
}
