import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const resendApiKey = Deno.env.get("RESEND_API_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { client_name, client_email, client_phone, dog_name, dog_breed, service_type, booking_date, booking_time, walker_email } = await req.json()

    // Send email to walker
    const walkerSubject = `New Booking: ${dog_name} - ${service_type}`
    const walkerHtml = `
      <h2>New Booking Received!</h2>
      <p><strong>Client:</strong> ${client_name}</p>
      <p><strong>Email:</strong> ${client_email}</p>
      <p><strong>Phone:</strong> ${client_phone}</p>
      <p><strong>Dog:</strong> ${dog_name} (${dog_breed})</p>
      <p><strong>Service:</strong> ${service_type}</p>
      <p><strong>Date:</strong> ${booking_date}</p>
      <p><strong>Time:</strong> ${booking_time}</p>
    `

    const walkerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Book My Walks <onboarding@resend.dev>",
        to: [walker_email || "itsericawilson@gmail.com"],
        subject: walkerSubject,
        html: walkerHtml,
      }),
    })

    // Send confirmation email to client
    const clientSubject = "Booking Confirmed!"
    const clientHtml = `
      <h2>Your booking is confirmed!</h2>
      <p>Hi ${client_name},</p>
      <p>Your booking has been submitted successfully.</p>
      <p><strong>Dog:</strong> ${dog_name}</p>
      <p><strong>Service:</strong> ${service_type}</p>
      <p><strong>Date:</strong> ${booking_date}</p>
      <p><strong>Time:</strong> ${booking_time}</p>
      <p>We'll be in touch soon!</p>
    `

    const clientResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Book My Walks <onboarding@resend.dev>",
        to: [client_email],
        subject: clientSubject,
        html: clientHtml,
      }),
    })

    return new Response(
      JSON.stringify({ success: true, walker: await walkerResponse.json(), client: await clientResponse.json() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
