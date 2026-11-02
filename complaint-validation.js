const MAX_DESCRIPTION_LENGTH = 1600;
const MAX_ADDRESS_LENGTH = 300;
const MAX_DURATION_TEXT_LENGTH = 120;
const MAX_DURATION_DAYS = 36500;

function parseFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Validate a client complaint payload before any database mutation. */
export function validateComplaintSubmission(input, allowedCategories) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';

  if (body.confirmed !== true) {
    return { ok: false, error: 'The citizen must explicitly confirm before the complaint is saved.' };
  }
  if (!category || !new Set(allowedCategories).has(category)) {
    return { ok: false, error: 'Select a valid complaint category.' };
  }
  if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: 'A complaint description of 1–1,600 characters is required.' };
  }
  if (!address || address.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: 'A location of 1–300 characters is required.' };
  }

  const lat = parseFiniteNumber(body.lat);
  const lng = parseFiniteNumber(body.lng);
  if (lat === null || lng === null) {
    return { ok: false, error: 'A valid, confirmed map location is required.' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'Location coordinates are invalid.' };
  }

  const hasDurationDays = body.durationDays !== null && body.durationDays !== undefined && body.durationDays !== '';
  let durationDays = null;
  if (hasDurationDays) {
    const rawDuration = body.durationDays;
    if (!(typeof rawDuration === 'number' || (typeof rawDuration === 'string' && /^\d+$/.test(rawDuration.trim())))) {
      return { ok: false, error: 'Duration in days must be a whole number between 0 and 36,500.' };
    }
    durationDays = Number(rawDuration);
    if (!Number.isInteger(durationDays) || durationDays < 0 || durationDays > MAX_DURATION_DAYS) {
      return { ok: false, error: 'Duration in days must be a whole number between 0 and 36,500.' };
    }
  }

  const rawDurationText = body.durationText;
  if (rawDurationText != null && typeof rawDurationText !== 'string' && typeof rawDurationText !== 'number') {
    return { ok: false, error: 'Duration text must be plain text.' };
  }
  const durationText = String(rawDurationText || (durationDays !== null ? `${durationDays} days` : 'Not specified')).trim();
  if (durationText.length > MAX_DURATION_TEXT_LENGTH) {
    return { ok: false, error: 'Duration text must be 120 characters or fewer.' };
  }

  return {
    ok: true,
    value: { category, description, address, lat, lng, durationDays, durationText }
  };
}
