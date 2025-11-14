/**
=========================================================
* Soft UI Dashboard React - v4.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState } from "react";

// react-router-dom components
import { Link } from "react-router-dom";

// @mui material components
import Switch from "@mui/material/Switch";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import curved9 from "assets/images/curved-images/curved-6.jpg";
function SignIn() {
  const [rememberMe, setRememberMe] = useState(true);
  const handleSetRememberMe = () => setRememberMe(!rememberMe);
  return /*#__PURE__*/React.createElement(CoverLayout, {
    title: "Welcome back",
    description: "Enter your email and password to sign in",
    image: curved9
  }, /*#__PURE__*/React.createElement(SoftBox, {
    component: "form",
    role: "form"
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1,
    ml: 0.5
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "label",
    variant: "caption",
    fontWeight: "bold"
  }, "Email")), /*#__PURE__*/React.createElement(SoftInput, {
    type: "email",
    placeholder: "Email"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1,
    ml: 0.5
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    component: "label",
    variant: "caption",
    fontWeight: "bold"
  }, "Password")), /*#__PURE__*/React.createElement(SoftInput, {
    type: "password",
    placeholder: "Password"
  })), /*#__PURE__*/React.createElement(SoftBox, {
    display: "flex",
    alignItems: "center"
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: rememberMe,
    onChange: handleSetRememberMe
  }), /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    onClick: handleSetRememberMe,
    sx: {
      cursor: "pointer",
      userSelect: "none"
    }
  }, "\xA0\xA0Remember me")), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 4,
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftButton, {
    variant: "gradient",
    color: "info",
    fullWidth: true
  }, "sign in")), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 3,
    textAlign: "center"
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    color: "text",
    fontWeight: "regular"
  }, "Don't have an account?", " ", /*#__PURE__*/React.createElement(SoftTypography, {
    component: Link,
    to: "/authentication/sign-up",
    variant: "button",
    color: "info",
    fontWeight: "medium",
    textGradient: true
  }, "Sign up")))));
}
export default SignIn;