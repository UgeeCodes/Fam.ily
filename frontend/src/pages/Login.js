import React, { useState, useEffect } from "react";
import styles from "../css/login.module.css";
import { Link, useNavigate } from "react-router-dom";
import jwt_decode from "jwt-decode";
import axios from "axios";
import API_BASE_URL from "../config/api";
const Login = () => {
  //route to dashboard
  const routeToDashBoard = (e) => {
    e.preventDefault();

    navigate("/dashboard");
  };

  const routeToWebLogin = (e) => {
    e.preventDefault();

    navigate("/facerec");
  };

  const [user, setUser] = useState(null);

  function handleCallbackResponse(response) {
    const userObject = jwt_decode(response.credential);
    console.log(userObject);
    setUser(userObject);
    document.getElementById("signInDiv").hidden = true;
    localStorage.setItem("user", userObject.name);
    localStorage.setItem("email", userObject.email);
  }

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  let navigate = useNavigate();

  //async function to handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    axios
      .post(`${API_BASE_URL}/login`, {
        username: username,
        password: password,
      })
      .then((res) => {
        if (res.status === 200) {
          localStorage.setItem("member_id", res.data.member_id);
          localStorage.setItem("name", res.data.name);
          localStorage.setItem("account", res.data.account);
          localStorage.setItem("picture", res.data.picture);
          localStorage.setItem("age", res.data.age);
          console.log(res.data.member_id);
          console.log(localStorage);
          navigate("/dashboard");
        }
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);

        if (err.response) {
          const status = err.response.status;
          if (status === 404) {
            setError(
              "Username not found. Please check your username or create an account.",
            );
          } else if (status === 400) {
            setError("Incorrect password. Please try again.");
          } else if (status === 500) {
            setError("Server error. Please try again later.");
          } else {
            setError("Login failed. Please try again.");
          }
        } else {
          setError(
            "Unable to connect to the server. Please check your connection.",
          );
        }
      });
  };

  const handleInputChange = (e, setter) => {
    setter(e.target.value);
    setError("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <div style={{ paddingTop: "100px", paddingLeft: "100px" }}>
          <form onSubmit={handleLogin}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <label>
              <span className={styles.username}>Username:</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleInputChange(e, setUsername)}
              />
            </label>
            <label>
              <span className={styles.password}>Password:</span>
              <input
                type="password"
                value={password}
                onChange={(e) => handleInputChange(e, setPassword)}
              />
            </label>
            <label>
              <Link className={styles.forgot} to="/forgot-password">
                Forgot Password?
              </Link>
            </label>
            <button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className={styles.spinnerContainer}>
                  <span className={styles.spinner}></span>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
            <button type="submit" onClick={(e) => routeToWebLogin(e)}>
              Login through Webcam
            </button>
            <div id="signInDiv"></div>
            {user && (
              <div>
                <img alt="user pfp" src={user.picture}></img>
                <p className={styles.h1}>Logged in as {user.name}</p>
                <button type="submit" onClick={(e) => routeToDashBoard(e)}>
                  Continue To Dashboard
                </button>
              </div>
            )}
            <div style={{ marginTop: "10px" }}>
              <Link className={styles.link} to="/register">
                Sign Up
              </Link>
            </div>
          </form>
        </div>
      </div>
      <div>
        <div>
          <div className={styles.form}>
            <h1 className={styles.h1}>Welcome back!</h1>
          </div>
        </div>
        <img
          src="https://static.vecteezy.com/system/resources/previews/002/292/974/non_2x/happy-family-with-son-and-daughter-parents-hugging-children-illustration-vector.jpg"
          alt="asdf"
        />
      </div>
    </div>
  );
};

export default Login;
