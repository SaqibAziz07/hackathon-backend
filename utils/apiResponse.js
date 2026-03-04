// Standardize success response
export const successResponse = (res, data = {}, message = "Success", status = 200) => {
  res.status(status).json({ success: true, message, data });
};

// Standardize error response
export const errorResponse = (res, message = "Error", status = 400, errors = null) => {
  res.status(status).json({ success: false, message, ...(errors && { errors }) });
};