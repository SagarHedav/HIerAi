export async function extractTextFromBuffer(mimeType, buffer) {
  try {
    if (!buffer) return ''
    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return (data.text || '').replace(/\s+/g, ' ').trim()
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return (result.value || '').replace(/\s+/g, ' ').trim()
    }
    // For unsupported DOC or others, return empty for now
    return ''
  } catch (e) {
    return ''
  }
}
