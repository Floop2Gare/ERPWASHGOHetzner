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

// react-router components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// @mui material components
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Icon from "@mui/material/Icon";
import MuiLink from "@mui/material/Link";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
function TransparentBlogCard({
  image,
  title,
  description,
  action
}) {
  const cardImageStyles = {
    width: "100%",
    height: "auto",
    minHeight: ({
      functions: {
        pxToRem
      }
    }) => pxToRem(235),
    margin: 0,
    boxShadow: ({
      boxShadows: {
        md
      }
    }) => md,
    transformOrigin: "50% 0",
    transform: `perspective(999px) rotateX(0deg) translateZ(0)`,
    WebkitBackfaceVisibility: "hidden",
    backfaceVisibility: "hidden",
    willChange: "transform, box-shadow",
    transition: ({
      transitions
    }) => transitions.create("transform", {
      easing: transitions.easing.easeIn,
      duration: transitions.duration.shorter
    }),
    "&:hover": {
      transform: `perspective(999px) rotateX(7deg) translate3d(0, -4px, 5px)`
    }
  };
  const cardActionStyles = {
    display: "inline-block",
    textDecoration: "none",
    "& .MuiTypography-root": {
      display: "flex",
      alignItems: "center"
    },
    "& .material-icons, .material-icons-round,": {
      fontSize: "1.125rem",
      transform: `translateX(2px)`,
      transition: "transform 0.2s cubic-bezier(0.34,1.61,0.7,1.3)"
    },
    "&:hover .material-icons, &:focus .material-icons, &:hover .material-icons-round, &:focus .material-icons-round": {
      transform: `translateX(6px)`
    }
  };
  return /*#__PURE__*/React.createElement(Card, {
    sx: {
      background: "transparent",
      boxShadow: "none",
      overflow: "visible"
    }
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(Link, {
    to: action.route
  }, /*#__PURE__*/React.createElement(CardMedia, {
    src: image,
    component: "img",
    title: title,
    sx: cardImageStyles
  })) : /*#__PURE__*/React.createElement(MuiLink, {
    href: action.route,
    target: "_blank",
    rel: "noreferrer"
  }, /*#__PURE__*/React.createElement(CardMedia, {
    src: image,
    component: "img",
    title: title,
    sx: cardImageStyles
  })), /*#__PURE__*/React.createElement(SoftBox, {
    py: 3
  }, action.type === "internal" ? /*#__PURE__*/React.createElement(Link, {
    to: action.route,
    sx: cardActionStyles
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    gutterBottom: true
  }, title)) : /*#__PURE__*/React.createElement(MuiLink, {
    href: action.route,
    target: "_blank",
    rel: "noreferrer",
    sx: cardActionStyles
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h5",
    gutterBottom: true
  }, title)), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 2
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    component: "p",
    color: "text"
  }, description)), action.type === "internal" ? /*#__PURE__*/React.createElement(Link, {
    to: action.route,
    sx: cardActionStyles
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: action.color,
    textTransform: "capitalize",
    component: "span"
  }, action.label, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "arrow_forward"))) : /*#__PURE__*/React.createElement(MuiLink, {
    href: action.route,
    target: "_blank",
    rel: "noreferrer",
    sx: cardActionStyles
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "body2",
    color: action.color,
    textTransform: "capitalize",
    component: "span"
  }, action.label, /*#__PURE__*/React.createElement(Icon, {
    sx: {
      fontWeight: "bold"
    }
  }, "arrow_forward")))));
}

// Typechecking props for the TransparentBlogCard
TransparentBlogCard.propTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  action: PropTypes.shape({
    type: PropTypes.oneOf(["external", "internal"]),
    route: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    color: PropTypes.oneOf(["inherit", "primary", "secondary", "info", "success", "warning", "error", "light", "dark", "text"]).isRequired
  }).isRequired
};
export default TransparentBlogCard;