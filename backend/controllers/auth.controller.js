const AuthService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

exports.signup = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.signup(email, password);
    res.json(result);

});

exports.verifySignup = asyncHandler(async (req, res) => {
    const { email, password, otp, first_name, last_name } = req.body;
    const user = await AuthService.verifySignup(email, password, otp, first_name, last_name);
    res.status(201).json(user);

});

exports.signin = asyncHandler(async (req, res) => {
    const token = await AuthService.signin(req.body.email, req.body.password);
    res.json(token);

});

exports.appLogin = asyncHandler(async (req, res) => {
    const result = await AuthService.appLogin(req.body.email, req.body.password);
    res.json(result);

});

exports.forgotPassword = asyncHandler(async (req, res) => {
    const result = await AuthService.forgotPassword(req.body.email);
    res.json(result);

});

exports.resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, new_password } = req.body;
    const result = await AuthService.resetPassword(email, otp, new_password);
    res.json(result);

});

// Google sign-in (two-step)
exports.googleLogin = asyncHandler(async (req, res) => {
    const { id_token } = req.body;
    const result = await AuthService.googleSignInStep1(id_token);
    res.json(result);

});

exports.googleVerify = asyncHandler(async (req, res) => {
    const { id_token, otp } = req.body;
    const result = await AuthService.googleSignInStep2(id_token, otp);
    res.json(result);

});
