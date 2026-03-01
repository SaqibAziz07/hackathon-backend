// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin only.' 
    });
  }
  next();
};

// Check if user is doctor
export const isDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Doctors only.' 
    });
  }
  next();
};

// Check if user is receptionist
export const isReceptionist = (req, res, next) => {
  if (req.user.role !== 'receptionist') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Receptionists only.' 
    });
  }
  next();
};

// Check if user is patient
export const isPatient = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Patients only.' 
    });
  }
  next();
};

// Check subscription plan
export const hasProPlan = (req, res, next) => {
  if (req.user.subscriptionPlan !== 'pro') {
    return res.status(403).json({ 
      success: false, 
      message: 'This feature requires Pro plan. Please upgrade.' 
    });
  }
  next();
};