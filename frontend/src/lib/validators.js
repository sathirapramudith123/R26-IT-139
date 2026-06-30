export function isRequired(v) { 
    return v != null && String(v).trim().length > 0; }

export function isValidEmail(s = "") { 
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()); }

export function isValidPhone(s = "") { 
    return /^(0|\+94)?\d{7,12}$/.test(s.replace(/\s/g, "")); }

export function isNumeric(v) { 
    return !isNaN(parseFloat(v)) && isFinite(v); }

export function isPositiveNumber(v) { 
    return isNumeric(v) && Number(v) > 0; }
    
export function isNonNegativeNumber(v) { 
    return isNumeric(v) && Number(v) >= 0; }