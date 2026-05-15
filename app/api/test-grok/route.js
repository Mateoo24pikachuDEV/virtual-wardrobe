import { grokChat } from '@/lib/ai/groq'

export async function GET() {
  try {
    const response = await grokChat({
  messages: [
    {
      role: 'user',
      content: 'Describe a dark minimal streetwear aesthetic in 1 sentence'
    }
  ]
})
    return Response.json({
      ok: true,
      response: response.content,
    })
  } catch (err) {
    return Response.json({
      ok: false,
      error: err.message,
    })
  }
}