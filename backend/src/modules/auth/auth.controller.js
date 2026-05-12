const authService = require("./auth.service");

const login = async (req, res) => {
  const result = await authService.login(req.body);
  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
};

const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: authService.formatAuthUser(req.user),
  });
};

module.exports = {
  login,
  getMe,
};
