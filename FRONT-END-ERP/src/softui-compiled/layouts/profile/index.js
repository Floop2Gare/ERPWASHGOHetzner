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

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import InstagramIcon from "@mui/icons-material/Instagram";

// Soft UI Dashboard React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard React examples
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import Footer from "examples/Footer";
import ProfileInfoCard from "examples/Cards/InfoCards/ProfileInfoCard";
import ProfilesList from "examples/Lists/ProfilesList";
import DefaultProjectCard from "examples/Cards/ProjectCards/DefaultProjectCard";
import PlaceholderCard from "examples/Cards/PlaceholderCard";

// Overview page components
import Header from "layouts/profile/components/Header";
import PlatformSettings from "layouts/profile/components/PlatformSettings";

// Data
import profilesListData from "layouts/profile/data/profilesListData";

// Images
import homeDecor1 from "assets/images/home-decor-1.jpg";
import homeDecor2 from "assets/images/home-decor-2.jpg";
import homeDecor3 from "assets/images/home-decor-3.jpg";
import team1 from "assets/images/team-1.jpg";
import team2 from "assets/images/team-2.jpg";
import team3 from "assets/images/team-3.jpg";
import team4 from "assets/images/team-4.jpg";
function Overview() {
  return /*#__PURE__*/React.createElement(DashboardLayout, null, /*#__PURE__*/React.createElement(Header, null), /*#__PURE__*/React.createElement(SoftBox, {
    mt: 5,
    mb: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 4
  }, /*#__PURE__*/React.createElement(PlatformSettings, null)), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 4
  }, /*#__PURE__*/React.createElement(ProfileInfoCard, {
    title: "profile information",
    description: "Hi, I\u2019m Alec Thompson, Decisions: If you can\u2019t decide, the answer is no. If two equally difficult paths, choose the one more painful in the short term (pain avoidance is creating an illusion of equality).",
    info: {
      fullName: "Alec M. Thompson",
      mobile: "(44) 123 1234 123",
      email: "alecthompson@mail.com",
      location: "USA"
    },
    social: [{
      link: "https://www.facebook.com/CreativeTim/",
      icon: /*#__PURE__*/React.createElement(FacebookIcon, null),
      color: "facebook"
    }, {
      link: "https://twitter.com/creativetim",
      icon: /*#__PURE__*/React.createElement(TwitterIcon, null),
      color: "twitter"
    }, {
      link: "https://www.instagram.com/creativetimofficial/",
      icon: /*#__PURE__*/React.createElement(InstagramIcon, null),
      color: "instagram"
    }],
    action: {
      route: "",
      tooltip: "Edit Profile"
    }
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    xl: 4
  }, /*#__PURE__*/React.createElement(ProfilesList, {
    title: "conversations",
    profiles: profilesListData
  })))), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 3
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(SoftBox, {
    pt: 2,
    px: 2
  }, /*#__PURE__*/React.createElement(SoftBox, {
    mb: 0.5
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "h6",
    fontWeight: "medium"
  }, "Projects")), /*#__PURE__*/React.createElement(SoftBox, {
    mb: 1
  }, /*#__PURE__*/React.createElement(SoftTypography, {
    variant: "button",
    fontWeight: "regular",
    color: "text"
  }, "Architects design houses"))), /*#__PURE__*/React.createElement(SoftBox, {
    p: 2
  }, /*#__PURE__*/React.createElement(Grid, {
    container: true,
    spacing: 3
  }, /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(DefaultProjectCard, {
    image: homeDecor1,
    label: "project #2",
    title: "modern",
    description: "As Uber works through a huge amount of internal management turmoil.",
    action: {
      type: "internal",
      route: "/pages/profile/profile-overview",
      color: "info",
      label: "view project"
    },
    authors: [{
      image: team1,
      name: "Elena Morison"
    }, {
      image: team2,
      name: "Ryan Milly"
    }, {
      image: team3,
      name: "Nick Daniel"
    }, {
      image: team4,
      name: "Peterson"
    }]
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(DefaultProjectCard, {
    image: homeDecor2,
    label: "project #1",
    title: "scandinavian",
    description: "Music is something that every person has his or her own specific opinion about.",
    action: {
      type: "internal",
      route: "/pages/profile/profile-overview",
      color: "info",
      label: "view project"
    },
    authors: [{
      image: team3,
      name: "Nick Daniel"
    }, {
      image: team4,
      name: "Peterson"
    }, {
      image: team1,
      name: "Elena Morison"
    }, {
      image: team2,
      name: "Ryan Milly"
    }]
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(DefaultProjectCard, {
    image: homeDecor3,
    label: "project #3",
    title: "minimalist",
    description: "Different people have different taste, and various types of music.",
    action: {
      type: "internal",
      route: "/pages/profile/profile-overview",
      color: "info",
      label: "view project"
    },
    authors: [{
      image: team4,
      name: "Peterson"
    }, {
      image: team3,
      name: "Nick Daniel"
    }, {
      image: team2,
      name: "Ryan Milly"
    }, {
      image: team1,
      name: "Elena Morison"
    }]
  })), /*#__PURE__*/React.createElement(Grid, {
    item: true,
    xs: 12,
    md: 6,
    xl: 3
  }, /*#__PURE__*/React.createElement(PlaceholderCard, {
    title: {
      variant: "h5",
      text: "New project"
    },
    outlined: true
  })))))), /*#__PURE__*/React.createElement(Footer, null));
}
export default Overview;