/**
 * USER ROLES
 */
export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  DOCTOR: "doctor",
  PATIENT: "patient",
});

/**
 * APPOINTMENT STATUS
 */
export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: "pending",
  REQUESTED: "requested",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
});

/**
 * APPOINTMENT TYPE
 */
export const APPOINTMENT_TYPE = Object.freeze({
  VIDEO: "video",
  IN_PERSON: "in_person",
});

/**
 * PAYMENT STATUS
 * Keep these values aligned with model/database allowed values:
 * pending, paid, failed, refunded
 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

/**
 * FACE VERIFICATION STATUS
 */
export const FACE_VERIFICATION_STATUS = Object.freeze({
  PENDING: "pending",
  VERIFIED: "verified",
  FAILED: "failed",
});

/**
 * VIDEO CALL STATUS
 */
export const VIDEO_CALL_STATUS = Object.freeze({
  NOT_STARTED: "not_started",
  WAITING: "waiting",
  ACTIVE: "active",
  ENDED: "ended",
});

/**
 * VIDEO CALL EVENTS
 */
export const VIDEO_EVENTS = Object.freeze({
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice_candidate",
  CALL_STARTED: "call_started",
  CALL_ENDED: "call_ended",
});

/**
 * AI SERVICE TYPES
 */
export const AI_SERVICES = Object.freeze({
  NURSE: "ai_nurse",
  TRANSLATION: "translation",
  VOICE: "voice",
});

/**
 * AI LANGUAGES
 */
export const SUPPORTED_LANGUAGES = Object.freeze({
  ENGLISH: "en",
  HINDI: "hi",
  KANNADA: "kn",
  TAMIL: "ta",
  TELUGU: "te",
});

/**
 * RESPONSE STATUS
 */
export const RESPONSE_STATUS = Object.freeze({
  SUCCESS: "success",
  ERROR: "error",
});

/**
 * HTTP STATUS CODES
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
});

/**
 * DEFAULT PAGINATION
 */
export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

/**
 * FILE UPLOAD LIMITS
 */
export const FILE_LIMITS = Object.freeze({
  IMAGE_MAX_SIZE: 5 * 1024 * 1024,
  PDF_MAX_SIZE: 10 * 1024 * 1024,
});

/**
 * ALLOWED FILE TYPES
 */
export const ALLOWED_FILE_TYPES = Object.freeze({
  IMAGES: ["image/jpeg", "image/png", "image/jpg"],
  DOCUMENTS: ["application/pdf"],
});

/**
 * SECURITY CONSTANTS
 */
export const SECURITY = Object.freeze({
  PASSWORD_MIN_LENGTH: 6,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
});

/**
 * RAZORPAY CONFIG DEFAULTS
 */
export const PAYMENT_CONFIG = Object.freeze({
  CURRENCY: "INR",
  DEFAULT_AMOUNT: 500,
});

/**
 * SOCKET ROOMS PREFIX
 */
export const SOCKET_ROOMS = Object.freeze({
  APPOINTMENT: "appointment_room_",
  USER: "user_",
});

/**
 * ERROR MESSAGES
 */
export const ERROR_MESSAGES = Object.freeze({
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access denied",
  NOT_FOUND: "Resource not found",
  INVALID_INPUT: "Invalid input data",
  SERVER_ERROR: "Something went wrong",
});

/**
 * SUCCESS MESSAGES
 */
export const SUCCESS_MESSAGES = Object.freeze({
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  FETCHED: "Data fetched successfully",
});

/**
 * APPOINTMENT TIME RULES
 */
export const APPOINTMENT_RULES = Object.freeze({
  MAX_DAYS_ADVANCE: 30,
  MIN_BUFFER_MINUTES: 15,
});