import './style.css'

const industries = [
  'Design',
  'Illustration',
  'Photography & Video',
  'Creative Arts',
  'Culture & Entertainment',
  'Business & Technology',
  'Education',
  'Music',
  'Fashion & Beauty',
  'Health & Wellness',
  'Non Profit & Activism',
  'Events & Hospitality',
  'Restaurants & Food',
  'Travel & Tourism',
  'Other',
]

const platforms = [
  'Wix',
  'Readymag',
  'Shopify',
  'Cargo',
  'Webflow',
  'Elementor',
  'WordPress',
  'Tilda',
  'Other',
]

const types = [
  'Portfolio',
  'E-commerce',
  'Landing page',
  'Interactive',
  'Concept Website',
  'Personal / Blog',
  'Company / Brand website',
]

const styles = [
  'Minimal',
  'Big Type',
  'Retro',
  'Dark',
  'Illustrative',
  'Grid',
  'Monochrome',
  'Hand-drawn',
  'Text-effects',
  'Costume cursor',
  'Animated gallery',
  'Mode switching',
  '3D elements',
  'Scrollitelling',
  'Hover animation',
  'Shaped masks',
  'Menu bar',
  'Creative coding',
]

/** Craftwork curated categories (id + name), max 3 selected */
const craftworkCategories = [
  { id: 4, name: 'Portfolio' },
  { id: 3, name: 'Agency' },
  { id: 10, name: 'E-commerce' },
  { id: 12, name: 'Tech' },
  { id: 8, name: 'Web Apps' },
  { id: 1, name: 'Desktop Apps' },
  { id: 7, name: 'Mobile Apps' },
  { id: 14, name: 'Design Tools' },
  { id: 2, name: 'Development Tools' },
  { id: 11, name: 'Productivity' },
  { id: 15, name: 'Marketing' },
  { id: 9, name: 'Finance' },
  { id: 6, name: 'Artificial Intelligence' },
  { id: 5, name: 'Web3' },
  { id: 13, name: 'Assets' },
  { id: 16, name: 'Catalog' },
]

const THUMBNAIL_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const THUMBNAIL_ALLOWED_EXT = /\.(jpe?g|png|webp)$/i
const THUMBNAIL_MAX_BYTES = 20 * 1024 * 1024
const THUMBNAIL_ALLOWED_SIZES = [
  { width: 2800, height: 2100 },
  { width: 1600, height: 1200 },
  { width: 1400, height: 1050 },
]

type FieldName =
  | 'projectName'
  | 'fullName'
  | 'email'
  | 'instagram'
  | 'xAccount'
  | 'studio'
  | 'websiteUrl'
  | 'industry'
  | 'platform'
  | 'type'
  | 'style'
  | 'craftworkCategories'
  | 'designBy'
  | 'codeBy'
  | 'description'
  | 'thumbnail'
  | 'emailSubject'
  | 'emailMessage'
  | 'terms'

type FieldState = { value: string; error: boolean; message: string }

const optionHtml = (items: string[]) =>
  items.map((item) => `<option value="${item}">${item}</option>`).join('')

const styleHtml = styles
  .map(
    (style) => `
      <label class="check">
        <input type="checkbox" name="style" value="${style}" />
        <span>${style}</span>
      </label>
    `,
  )
  .join('')

const craftworkCategoryHtml = craftworkCategories
  .map(
    (cat) => `
      <label class="check">
        <input type="checkbox" name="craftworkCategories" value="${cat.id}" />
        <span>${cat.name}</span>
      </label>
    `,
  )
  .join('')

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname
  } catch {
    return false
  }
}

const createField = (): FieldState => ({ value: '', error: false, message: '' })

const formData: Record<FieldName, FieldState> = {
  projectName: createField(),
  fullName: createField(),
  email: createField(),
  instagram: createField(),
  xAccount: createField(),
  studio: createField(),
  websiteUrl: createField(),
  industry: createField(),
  platform: createField(),
  type: createField(),
  style: createField(),
  craftworkCategories: createField(),
  designBy: createField(),
  codeBy: createField(),
  description: createField(),
  thumbnail: createField(),
  emailSubject: createField(),
  emailMessage: createField(),
  terms: createField(),
}

let thumbnailFile: File | null = null
let thumbnailPreviewUrl: string | null = null
let emailAttachments: File[] = []

const fieldHtml = (
  name: FieldName,
  title: string,
  control: string,
  options: { checkbox?: boolean } = {},
) => `
  <div class="field" data-field="${name}">
    ${
      options.checkbox
        ? `<div class="control-wrap">${control}<p class="field-error" hidden></p></div>`
        : `<span class="title">${title}</span>
           <div class="control-wrap">${control}<p class="field-error" hidden></p></div>`
    }
  </div>
`

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <form id="submit-form" novalidate>
      <h1>Submit your website</h1>
      <p class="hint">Submitting to siteofsites.co, minimal.gallery, onepagelove.com, craftwork.design, ogimage.gallery, s5-style.com, and email</p>

      ${fieldHtml('projectName', 'Project Name*', '<input class="control" type="text" name="projectName" />')}
      ${fieldHtml('fullName', 'Full Name*', '<input class="control" type="text" name="fullName" placeholder="John Doe" />')}
      ${fieldHtml('email', 'Email*', '<input class="control" type="email" name="email" placeholder="Your@email.com" />')}
      ${fieldHtml('instagram', 'Instagram account name*', '<input class="control" type="text" name="instagram" placeholder="@youraccount" />')}
      ${fieldHtml('xAccount', 'X (Twitter) account', '<input class="control" type="text" name="xAccount" placeholder="@youraccount (optional, Craftwork / OGimage)" />')}
      ${fieldHtml('studio', 'Studio/Agency Name*', '<input class="control" type="text" name="studio" placeholder="Studio name" />')}
      ${fieldHtml('websiteUrl', 'Website URL*', '<input class="control" type="url" name="websiteUrl" placeholder="https://example.com" />')}

      <div class="field" data-field="thumbnail">
        <div class="field-label-row">
          <span class="title">Thumbnail Image</span>
          <span class="badge-required">Required</span>
        </div>
        <div class="control-wrap">
          <div class="thumbnail-layout">
            <div class="thumbnail-upload">
              <div class="thumbnail-preview" id="thumbnail-preview" aria-hidden="true">
                <svg class="thumbnail-placeholder-icon" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1.5" y="1.5" width="37" height="29" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="12" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M1.5 22.5L12 14l8 6 6-4.5 12 8.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
              </div>
              <button type="button" class="thumbnail-select" id="thumbnail-select">Select Image</button>
              <input type="file" name="thumbnail" id="thumbnail-input" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden />
            </div>
            <div class="thumbnail-specs">
              <div>Size: Width 2800px × Height 2100px</div>
              <div>Also accepted:</div>
              <ul>
                <li>Width 1600px × Height 1200px</li>
                <li>Width 1400px × Height 1050px</li>
              </ul>
              <div>Extension: JPG / PNG / WebP</div>
              <div>Max size: ~20MB</div>
              <p class="note">Uploaded images will be compressed to an appropriate format before being published.</p>
            </div>
          </div>
          <p class="field-error" hidden></p>
        </div>
      </div>
      ${fieldHtml(
        'industry',
        'Industry*',
        `<select class="control" name="industry"><option value="">Choose industry</option>${optionHtml(industries)}</select>`,
      )}
      ${fieldHtml(
        'platform',
        'Platform*',
        `<select class="control" name="platform"><option value="">Choose platform</option>${optionHtml(platforms)}</select>`,
      )}
      ${fieldHtml(
        'type',
        'Type*',
        `<select class="control" name="type"><option value="">Choose type</option>${optionHtml(types)}</select>`,
      )}

      <div class="field" data-field="style">
        <span class="title">Style*</span>
        <div class="control-wrap">
          <div class="styles">${styleHtml}</div>
          <p class="field-error" hidden></p>
        </div>
      </div>

      <div class="field" data-field="craftworkCategories">
        <span class="title">Craftwork category* (up to 3)</span>
        <div class="control-wrap">
          <div class="styles">${craftworkCategoryHtml}</div>
          <p class="field-error" hidden></p>
        </div>
      </div>

      ${fieldHtml('designBy', 'Design by*', '<input class="control" type="text" name="designBy" />')}
      ${fieldHtml('codeBy', 'Code by*', '<input class="control" type="text" name="codeBy" />')}
      ${fieldHtml(
        'description',
        'Description*',
        '<textarea class="control" name="description" rows="4" placeholder="Describe your website (interesting behaviors, motion, etc.)"></textarea>',
      )}

      <div class="section-label">Email message</div>
      ${fieldHtml(
        'emailSubject',
        'Subject*',
        '<input class="control" type="text" name="emailSubject" placeholder="Subject" />',
      )}
      <div class="field" data-field="emailMessage">
        <span class="title">Message*</span>
        <div class="control-wrap">
          <div class="mail-composer" id="mail-composer">
            <textarea
              class="control mail-body"
              name="emailMessage"
              rows="8"
              placeholder="Write your message…"
            ></textarea>
            <div class="mail-composer-footer">
              <div class="mail-attach-actions">
                <button type="button" class="mail-attach-btn" id="email-attach-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M16.5 6.5v8.25a4.5 4.5 0 1 1-9 0V6.75a3 3 0 0 1 6 0v7.5a1.5 1.5 0 1 1-3 0V7.5h-1.5v6.75a3 3 0 1 0 6 0V6.75a4.5 4.5 0 1 0-9 0v8a6 6 0 1 0 12 0V6.5h-1.5z"/>
                  </svg>
                  Attach files
                </button>
                <span class="mail-attach-hint">Photos, videos, documents — drag &amp; drop here</span>
              </div>
              <ul class="mail-attachments" id="email-attachments" hidden></ul>
              <input
                type="file"
                id="email-attach-input"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                hidden
              />
            </div>
          </div>
          <p class="field-error" hidden></p>
        </div>
      </div>

      ${fieldHtml(
        'terms',
        '',
        `<label class="check terms">
          <input type="checkbox" name="terms" />
          <span class="title">By submitting your website to Site of Sites you are agreeing to our terms and conditions.*</span>
        </label>`,
        { checkbox: true },
      )}

      <button type="submit" id="submit-btn">Submit</button>
      <p id="status" class="status" role="status" aria-live="polite" hidden></p>
    </form>
  `

  const form = app.querySelector<HTMLFormElement>('#submit-form')!
  const status = app.querySelector<HTMLParagraphElement>('#status')!
  const button = form.querySelector<HTMLButtonElement>('#submit-btn')!

  const getWrap = (name: FieldName) =>
    form.querySelector<HTMLElement>(`[data-field="${name}"]`)

  const paintField = (name: FieldName) => {
    const wrap = getWrap(name)
    if (!wrap) return
    const field = formData[name]
    wrap.classList.toggle('error', field.error)
    const errorEl = wrap.querySelector<HTMLElement>('.field-error')
    if (errorEl) {
      errorEl.hidden = !field.error || !field.message
      errorEl.textContent = field.error ? field.message : ''
    }
  }

  const setError = (name: FieldName, error: boolean, message = '') => {
    formData[name].error = error
    formData[name].message = error ? message : ''
    paintField(name)
  }

  const clearError = (name: FieldName) => setError(name, false)

  const readValue = (name: Exclude<FieldName, 'style' | 'craftworkCategories' | 'terms' | 'thumbnail'>) => {
    const el = form.elements.namedItem(name)
    if (!el || !('value' in el)) return ''
    return String((el as unknown as HTMLInputElement).value).trim()
  }

  const syncFromDom = () => {
    ;(
      [
        'projectName',
        'fullName',
        'email',
        'instagram',
        'xAccount',
        'studio',
        'websiteUrl',
        'industry',
        'platform',
        'type',
        'designBy',
        'codeBy',
        'description',
        'emailSubject',
        'emailMessage',
      ] as const
    ).forEach((name) => {
      formData[name].value = readValue(name)
    })

    formData.style.value = [
      ...form.querySelectorAll<HTMLInputElement>('input[name="style"]:checked'),
    ]
      .map((input) => input.value)
      .join(',')

    formData.craftworkCategories.value = [
      ...form.querySelectorAll<HTMLInputElement>(
        'input[name="craftworkCategories"]:checked',
      ),
    ]
      .map((input) => input.value)
      .join(',')

    formData.terms.value = (
      form.elements.namedItem('terms') as HTMLInputElement
    ).checked
      ? '1'
      : ''
  }

  const validateProjectName = () => {
    const ok = !!formData.projectName.value
    setError('projectName', !ok, 'Enter project name')
  }

  const validateFullName = () => {
    const ok = !!formData.fullName.value
    setError('fullName', !ok, 'Enter full name')
  }

  const validateEmail = () => {
    const value = formData.email.value
    if (!value) setError('email', true, 'Enter email')
    else if (!isEmail(value)) setError('email', true, 'Enter a valid email')
    else setError('email', false)
  }

  const validateInstagram = () => {
    const ok = !!formData.instagram.value
    setError('instagram', !ok, 'Enter Instagram account')
  }

  const validateWebsiteUrl = () => {
    const value = formData.websiteUrl.value
    if (!value) setError('websiteUrl', true, 'Enter website URL')
    else if (!/^https?:\/\//i.test(value)) {
      setError('websiteUrl', true, 'URL must start with http:// or https://')
    } else if (!isHttpUrl(value)) {
      setError('websiteUrl', true, 'Enter a valid URL, e.g. https://example.com')
    } else setError('websiteUrl', false)
  }

  const validateStudio = () => {
    const ok = !!formData.studio.value
    setError('studio', !ok, 'Enter studio/agency name')
  }

  const validateIndustry = () => {
    const ok = !!formData.industry.value
    setError('industry', !ok, 'Choose industry')
  }

  const validatePlatform = () => {
    const ok = !!formData.platform.value
    setError('platform', !ok, 'Choose platform')
  }

  const validateType = () => {
    const ok = !!formData.type.value
    setError('type', !ok, 'Choose type')
  }

  const validateDesignBy = () => {
    const ok = !!formData.designBy.value
    setError('designBy', !ok, 'Enter designer name')
  }

  const validateCodeBy = () => {
    const ok = !!formData.codeBy.value
    setError('codeBy', !ok, 'Enter developer name')
  }

  const validateDescription = () => {
    const ok = !!formData.description.value
    setError('description', !ok, 'Enter description')
  }

  const validateEmailSubject = () => {
    const ok = !!formData.emailSubject.value
    setError('emailSubject', !ok, 'Enter email subject')
  }

  const validateEmailMessage = () => {
    const ok = !!formData.emailMessage.value || emailAttachments.length > 0
    setError('emailMessage', !ok, 'Enter a message or attach files')
  }

  const validateStyle = () => {
    const ok = formData.style.value.length > 0
    setError('style', !ok, 'Select at least one style')
  }

  const validateCraftworkCategories = () => {
    const ids = formData.craftworkCategories.value
      .split(',')
      .filter(Boolean)
    if (!ids.length) {
      setError('craftworkCategories', true, 'Select at least one Craftwork category')
    } else if (ids.length > 3) {
      setError('craftworkCategories', true, 'Select up to 3 categories')
    } else {
      setError('craftworkCategories', false)
    }
  }

  const validateTerms = () => {
    const ok = formData.terms.value === '1'
    setError('terms', !ok, 'You must agree to the terms')
  }

  const readImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        URL.revokeObjectURL(url)
        resolve({ width, height })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not read image'))
      }
      img.src = url
    })

  const paintThumbnailPreview = () => {
    const preview = form.querySelector<HTMLElement>('#thumbnail-preview')
    if (!preview) return
    if (thumbnailPreviewUrl) {
      preview.innerHTML = `<img src="${thumbnailPreviewUrl}" alt="Thumbnail preview" />`
    } else {
      preview.innerHTML = `
        <svg class="thumbnail-placeholder-icon" viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="1.5" width="37" height="29" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="12" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/>
          <path d="M1.5 22.5L12 14l8 6 6-4.5 12 8.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      `
    }
  }

  const clearThumbnail = () => {
    thumbnailFile = null
    formData.thumbnail.value = ''
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl)
      thumbnailPreviewUrl = null
    }
    const input = form.querySelector<HTMLInputElement>('#thumbnail-input')
    if (input) input.value = ''
    paintThumbnailPreview()
  }

  const validateThumbnail = async () => {
    if (!thumbnailFile) {
      setError('thumbnail', true, 'Select a thumbnail image')
      return false
    }

    const typeOk =
      THUMBNAIL_ALLOWED_TYPES.includes(thumbnailFile.type) ||
      THUMBNAIL_ALLOWED_EXT.test(thumbnailFile.name)
    if (!typeOk) {
      setError('thumbnail', true, 'Use JPG, PNG or WebP')
      return false
    }

    if (thumbnailFile.size > THUMBNAIL_MAX_BYTES) {
      setError('thumbnail', true, 'Image must be under 20MB')
      return false
    }

    try {
      const { width, height } = await readImageDimensions(thumbnailFile)
      const sizeOk = THUMBNAIL_ALLOWED_SIZES.some(
        (size) => size.width === width && size.height === height,
      )
      if (!sizeOk) {
        setError(
          'thumbnail',
          true,
          `Size must be 2800×2100, 1600×1200 or 1400×1050 (now ${width}×${height})`,
        )
        return false
      }
    } catch {
      setError('thumbnail', true, 'Could not read image dimensions')
      return false
    }

    setError('thumbnail', false)
    return true
  }

  const validateAll = async () => {
    syncFromDom()
    validateProjectName()
    validateFullName()
    validateEmail()
    validateInstagram()
    validateStudio()
    validateWebsiteUrl()
    validateIndustry()
    validatePlatform()
    validateType()
    validateDesignBy()
    validateCodeBy()
    validateDescription()
    validateStyle()
    validateCraftworkCategories()
    validateEmailSubject()
    validateEmailMessage()
    validateTerms()
    await validateThumbnail()

    return !(
      formData.projectName.error ||
      formData.fullName.error ||
      formData.email.error ||
      formData.instagram.error ||
      formData.studio.error ||
      formData.websiteUrl.error ||
      formData.industry.error ||
      formData.platform.error ||
      formData.type.error ||
      formData.designBy.error ||
      formData.codeBy.error ||
      formData.description.error ||
      formData.style.error ||
      formData.craftworkCategories.error ||
      formData.thumbnail.error ||
      formData.emailSubject.error ||
      formData.emailMessage.error ||
      formData.terms.error
    )
  }

  const setStatus = (message: string, type: 'ok' | 'error' | 'pending') => {
    status.hidden = false
    status.dataset.type = type
    status.textContent = message
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const bindField = (
    name: FieldName,
    onBlur?: () => void,
  ) => {
    const wrap = getWrap(name)
    if (!wrap) return

    wrap.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('focus', () => clearError(name))
      el.addEventListener('input', () => clearError(name))
      el.addEventListener('change', () => clearError(name))
      if (onBlur) el.addEventListener('blur', () => {
        syncFromDom()
        onBlur()
      })
    })
  }

  bindField('projectName', validateProjectName)
  bindField('fullName', validateFullName)
  bindField('email', validateEmail)
  bindField('instagram', validateInstagram)
  bindField('xAccount')
  bindField('studio', validateStudio)
  bindField('websiteUrl', validateWebsiteUrl)
  bindField('industry', validateIndustry)
  bindField('platform', validatePlatform)
  bindField('type', validateType)
  bindField('style', validateStyle)
  bindField('craftworkCategories', validateCraftworkCategories)
  bindField('designBy', validateDesignBy)
  bindField('codeBy', validateCodeBy)
  bindField('description', validateDescription)
  bindField('emailSubject', validateEmailSubject)
  bindField('emailMessage', validateEmailMessage)
  bindField('terms', validateTerms)

  const thumbnailInput = form.querySelector<HTMLInputElement>('#thumbnail-input')!
  const thumbnailSelect = form.querySelector<HTMLButtonElement>('#thumbnail-select')!

  thumbnailSelect.addEventListener('click', () => thumbnailInput.click())
  thumbnailInput.addEventListener('change', async () => {
    clearError('thumbnail')
    const file = thumbnailInput.files?.[0] ?? null
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl)
      thumbnailPreviewUrl = null
    }
    thumbnailFile = file
    formData.thumbnail.value = file ? file.name : ''
    if (file) {
      thumbnailPreviewUrl = URL.createObjectURL(file)
    }
    paintThumbnailPreview()
    if (file) await validateThumbnail()
  })

  const emailAttachInput = form.querySelector<HTMLInputElement>('#email-attach-input')!
  const emailAttachBtn = form.querySelector<HTMLButtonElement>('#email-attach-btn')!
  const emailAttachList = form.querySelector<HTMLUListElement>('#email-attachments')!
  const mailComposer = form.querySelector<HTMLElement>('#mail-composer')!

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fileKind = (file: File) => {
    if (file.type.startsWith('image/')) return 'Image'
    if (file.type.startsWith('video/')) return 'Video'
    if (file.type.startsWith('audio/')) return 'Audio'
    return 'File'
  }

  const paintEmailAttachments = () => {
    emailAttachList.hidden = emailAttachments.length === 0
    emailAttachList.innerHTML = emailAttachments
      .map(
        (file, index) => `
        <li class="mail-attachment-item" data-index="${index}">
          <span class="mail-attachment-kind">${fileKind(file)}</span>
          <span class="mail-attachment-name" title="${file.name}">${file.name}</span>
          <span class="mail-attachment-size">${formatBytes(file.size)}</span>
          <button type="button" class="mail-attachment-remove" data-index="${index}" aria-label="Remove ${file.name}">×</button>
        </li>
      `,
      )
      .join('')
  }

  const addEmailAttachments = (files: FileList | File[]) => {
    const incoming = [...files]
    const keyOf = (f: File) => `${f.name}:${f.size}:${f.lastModified}`
    const existing = new Set(emailAttachments.map(keyOf))
    const next = [...emailAttachments]
    for (const file of incoming) {
      if (!existing.has(keyOf(file))) {
        next.push(file)
        existing.add(keyOf(file))
      }
    }
    const total = next.reduce((sum, f) => sum + f.size, 0)
    const maxBytes = 18 * 1024 * 1024
    if (total > maxBytes) {
      setError(
        'emailMessage',
        true,
        `Attachments too large (${(total / (1024 * 1024)).toFixed(1)}MB). Keep under 18MB for Gmail`,
      )
      return
    }
    emailAttachments = next
    paintEmailAttachments()
    clearError('emailMessage')
    syncFromDom()
    validateEmailMessage()
  }

  const clearEmailAttachments = () => {
    emailAttachments = []
    emailAttachInput.value = ''
    paintEmailAttachments()
  }

  emailAttachBtn.addEventListener('click', () => emailAttachInput.click())
  emailAttachInput.addEventListener('change', () => {
    if (emailAttachInput.files?.length) {
      addEmailAttachments(emailAttachInput.files)
      emailAttachInput.value = ''
    }
  })
  emailAttachList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest<HTMLButtonElement>('.mail-attachment-remove')
    if (!btn) return
    const index = Number(btn.dataset.index)
    if (Number.isNaN(index)) return
    emailAttachments.splice(index, 1)
    paintEmailAttachments()
    syncFromDom()
    validateEmailMessage()
  })

  ;['dragenter', 'dragover'].forEach((eventName) => {
    mailComposer.addEventListener(eventName, (e) => {
      e.preventDefault()
      mailComposer.classList.add('is-dragover')
    })
  })
  ;['dragleave', 'drop'].forEach((eventName) => {
    mailComposer.addEventListener(eventName, (e) => {
      e.preventDefault()
      mailComposer.classList.remove('is-dragover')
    })
  })
  mailComposer.addEventListener('drop', (e) => {
    const dt = (e as DragEvent).dataTransfer
    if (dt?.files?.length) addEmailAttachments(dt.files)
  })

  // Enforce max 3 Craftwork categories while selecting
  form.querySelectorAll<HTMLInputElement>(
    'input[name="craftworkCategories"]',
  ).forEach((input) => {
    input.addEventListener('change', () => {
      const checked = [
        ...form.querySelectorAll<HTMLInputElement>(
          'input[name="craftworkCategories"]:checked',
        ),
      ]
      if (checked.length > 3) {
        input.checked = false
      }
      syncFromDom()
      validateCraftworkCategories()
    })
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const valid = await validateAll()
    if (!valid) {
      const firstError = form.querySelector<HTMLElement>('.field.error')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setStatus('Fix the highlighted fields', 'error')
      return
    }

    const payload = {
      projectName: formData.projectName.value,
      fullName: formData.fullName.value,
      email: formData.email.value,
      instagram: formData.instagram.value,
      xAccount: formData.xAccount.value || undefined,
      studio: formData.studio.value,
      websiteUrl: formData.websiteUrl.value,
      industry: formData.industry.value,
      platform: formData.platform.value,
      type: formData.type.value,
      style: formData.style.value.split(',').filter(Boolean),
      craftworkCategoryIds: formData.craftworkCategories.value
        .split(',')
        .filter(Boolean)
        .map(Number),
      designBy: formData.designBy.value,
      codeBy: formData.codeBy.value,
      description: formData.description.value,
      emailSubject: formData.emailSubject.value,
      emailMessage: formData.emailMessage.value,
      terms: true,
    }

    const body = new FormData()
    body.append('payload', JSON.stringify(payload))
    if (thumbnailFile) body.append('thumbnail', thumbnailFile)
    emailAttachments.forEach((file) => {
      body.append('emailAttachment', file)
    })

    button.disabled = true
    button.textContent = 'Submitting…'
    setStatus('Submitting to all targets…', 'pending')

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        body,
      })
      const result = await res.json()
      const sos = result.results?.siteOfSites
      const mg = result.results?.minimalGallery
      const opl = result.results?.onePageLove
      const cw = result.results?.craftwork
      const og = result.results?.ogImage
      const s5 = result.results?.s5Style
      const mail = result.results?.email

      const resultsArray =
        result.resultsArray ??
        [
          { site: 'siteOfSites', ...sos },
          { site: 'minimalGallery', ...mg },
          { site: 'onePageLove', ...opl },
          { site: 'craftwork', ...cw },
          { site: 'ogImage', ...og },
          { site: 's5Style', ...s5 },
          { site: 'email', ...mail },
        ].map((row) => ({
          site: row.site,
          ok: !!row.ok,
          status: row.status ?? 0,
          error: row.error ?? null,
        }))

      console.log('[submit] results', resultsArray)

      const line = (name: string, target: { ok?: boolean; error?: string; data?: { message?: string } } | undefined) => {
        if (!target) return `${name}: no response`
        if (target.ok) return `${name}: ok`
        return `${name}: ${target.error || target.data?.message || 'fail'}`
      }

      const summary = [
        line('Site of Sites', sos),
        line('Minimal Gallery', mg),
        line('One Page Love', opl),
        line('Craftwork', cw),
        line('OGimage', og),
        line('S5-Style', s5),
        line('Email', mail),
      ].join(' · ')

      if (result.ok) {
        setStatus(`✓ ${summary}`, 'ok')
        button.textContent = 'Submitted'
        form.reset()
        clearThumbnail()
        clearEmailAttachments()
        ;(Object.keys(formData) as FieldName[]).forEach((name) => {
          formData[name].value = ''
          clearError(name)
        })
        return
      }

      if (sos?.ok || mg?.ok || opl?.ok || cw?.ok || og?.ok || s5?.ok || mail?.ok) {
        setStatus(summary, 'pending')
        button.textContent = 'Partial — try again'
        return
      }

      setStatus(
        [summary, result.error].filter(Boolean).join(' · ') ||
          `Submit failed (${res.status})`,
        'error',
      )
      button.textContent = 'Failed — try again'
    } catch {
      setStatus('Network error while submitting', 'error')
      button.textContent = 'Failed — try again'
    } finally {
      button.disabled = false
      window.setTimeout(() => {
        if (button.textContent !== 'Submit') button.textContent = 'Submit'
      }, 2500)
    }
  })
}
