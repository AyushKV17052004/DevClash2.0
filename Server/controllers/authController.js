import jwt from "jsonwebtoken";
import { User } from "../Models/User.js";

const getJwtSecret = () => process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

export async function signup(req, res) {
  try {
    const { username, email, password } = req.body;
    const u = String(username || "").trim();
    const e = String(email || "").trim().toLowerCase();
    const p = String(password || "");

    if (!u || u.length < 2) {
      return res.status(400).json({ error: "Username must be at least 2 characters." });
    }
    if (!e) {
      return res.status(400).json({ error: "Email is required." });
    }
    if (!p || p.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({
      $or: [{ email: e }, { username: u.toLowerCase() }],
    });
    if (existing) {
      if (existing.email === e) {
        return res.status(409).json({ error: "User with this email already exists." });
      }
      return res.status(409).json({ error: "Username is already taken." });
    }

    const user = await User.create({
      username: u,
      email: e,
      password: p,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("signup:", err);
    return res.status(500).json({ error: err.message || "Signup failed." });
  }
}

export async function login(req, res) {
  try {
    const { emailOrUsername, password } = req.body;
    const input = String(emailOrUsername || "").trim();
    const p = String(password || "");

    if (!input || !p) {
      return res.status(400).json({ error: "Email/username and password are required." });
    }

    const isEmail = input.includes("@");
    const user = await User.findOne(
      isEmail ? { email: input.toLowerCase() } : { username: { $regex: new RegExp(`^${input}$`, "i") } }
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid email/username or password." });
    }

    const valid = await user.comparePassword(p);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email/username or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("login:", err);
    return res.status(500).json({ error: err.message || "Login failed." });
  }
}

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
