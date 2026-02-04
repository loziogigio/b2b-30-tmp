import { NextResponse } from 'next/server';

const PIM_API_URL = process.env.PIM_API_PRIVATE_URL || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company_name,
      email,
      city,
      address,
      phone,
      vat_number,
      sdi_code,
      pec,
      notes,
    } = body;

    // Validate required fields
    if (!company_name || !email) {
      return NextResponse.json(
        { success: false, message: 'Company name and email are required' },
        { status: 400 },
      );
    }

    // Call vinc-commerce-suite S2S API
    const response = await fetch(
      `${PIM_API_URL}/api/b2b/emails/registration-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ragioneSociale: company_name,
          email,
          comune: city,
          indirizzo: address,
          telefono: phone,
          partitaIva: vat_number,
          sdi: sdi_code,
          pec,
          note: notes,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[registration-request] Email API error:', data);
      return NextResponse.json(
        {
          success: false,
          message: data.error || 'Failed to submit registration request',
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration request submitted successfully',
    });
  } catch (error) {
    console.error('[registration-request] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while submitting your request',
      },
      { status: 500 },
    );
  }
}
