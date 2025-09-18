/**
 * Utilitaires pour la manipulation sécurisée de JSON
 */

/**
 * Parse une chaîne JSON de manière sécurisée
 * @param jsonString Chaîne JSON à parser
 * @param defaultValue Valeur par défaut en cas d'erreur
 * @returns L'objet parsé ou la valeur par défaut
 */
export function safeJsonParse<T>(jsonString: unknown, defaultValue: T): T {
  try {
    // Si c'est déjà un objet, le retourner directement
    if (typeof jsonString !== 'string') {
      return jsonString as T;
    }
    
    // Sinon, parser la chaîne
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Erreur lors du parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Valide un objet JSON par rapport à un schéma attendu
 * @param obj Objet à valider
 * @param requiredFields Liste des champs requis
 * @returns L'objet validé ou null si invalide
 */
export function validateJsonObject<T>(obj: unknown, requiredFields: string[]): T | null {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return null;
  }

  // Vérifier que tous les champs requis sont présents
  for (const field of requiredFields) {
    if (!(field in obj)) {
      return null;
    }
  }

  return obj as T;
}

/**
 * Parse et valide une chaîne JSON
 * @param jsonString Chaîne JSON à parser et valider
 * @param requiredFields Liste des champs requis
 * @param defaultValue Valeur par défaut en cas d'erreur
 * @returns L'objet parsé et validé ou la valeur par défaut
 */
export function parseAndValidateJson<T>(
  jsonString: unknown, 
  requiredFields: string[], 
  defaultValue: T
): T {
  const parsed = safeJsonParse<unknown>(jsonString, null);
  const validated = validateJsonObject<T>(parsed, requiredFields);
  return validated || defaultValue;
}

/**
 * Stringify un objet JSON de manière sécurisée
 * @param obj Objet à convertir en chaîne JSON
 * @returns La chaîne JSON ou une chaîne vide en cas d'erreur
 */
export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Erreur lors de la conversion en JSON:', error);
    return '';
  }
}

/**
 * Vérifie si une chaîne est un JSON valide
 * @param str Chaîne à vérifier
 * @returns true si la chaîne est un JSON valide, false sinon
 */
export function isValidJson(str: unknown): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
}
