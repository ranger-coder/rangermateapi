module.exports = {
  "openapi": "3.0.0",
  "info": {
    "title": "mcodellp API Platform",
    "version": "1.0.0",
    "description": "RESTful API documentation for mcodellp application (Authentication, Classes, Subscriptions, Gamification, Attendance, and Productivity tools)"
  },
  "servers": [
    {
      "url": "/",
      "description": "Current Server (Relative)"
    },
    {
      "url": "https://api.mcodellp.com",
      "description": "Custom API Domain"
    },
    {
      "url": "http://localhost:5001",
      "description": "Local Development Server"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "paths": {
    "/api/auth/login": {
      "post": {
        "summary": "User and Admin Login",
        "tags": [
          "Authentication"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "password"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "example": "admin@rangermate.com"
                  },
                  "password": {
                    "type": "string",
                    "example": "admin@rangermate"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful, returns JWT token and user profile"
          },
          "401": {
            "description": "Invalid credentials"
          }
        }
      }
    },
    "/api/auth/register-student": {
      "post": {
        "summary": "Register Student Account",
        "tags": [
          "Authentication"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "username",
                  "password"
                ],
                "properties": {
                  "email": {
                    "type": "string"
                  },
                  "username": {
                    "type": "string"
                  },
                  "password": {
                    "type": "string"
                  },
                  "name": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Student registered successfully with free plan"
          }
        }
      }
    },
    "/api/admin/login": {
      "post": {
        "summary": "Admin Direct Login",
        "tags": [
          "Admin"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "username": {
                    "type": "string"
                  },
                  "password": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Admin authenticated"
          }
        }
      }
    },
    "/api/admin/all-users": {
      "get": {
        "summary": "Get All System Users across Institutions",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of all registered users"
          }
        }
      }
    },
    "/api/admin/create-account": {
      "post": {
        "summary": "Create School / Institution Account",
        "tags": [
          "Admin"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Institution created"
          }
        }
      }
    },
    "/api/admin/subscriptions": {
      "get": {
        "summary": "Get All Student Subscriptions",
        "tags": [
          "Admin",
          "Subscriptions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of subscriptions"
          }
        }
      }
    },
    "/api/admin/subscriptions/{id}/plan": {
      "put": {
        "summary": "Update Student Subscription Plan (free/paid)",
        "tags": [
          "Admin",
          "Subscriptions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Plan updated"
          }
        }
      }
    },
    "/api/subscription/me": {
      "get": {
        "summary": "Get Current User Subscription & Restrictions",
        "tags": [
          "Subscriptions"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "User active plan and quotas"
          }
        }
      }
    },
    "/api/user/settings": {
      "get": {
        "summary": "Get User Settings",
        "tags": [
          "User"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Settings"
          }
        }
      },
      "put": {
        "summary": "Update User Settings",
        "tags": [
          "User"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Settings updated"
          }
        }
      }
    },
    "/api/classes": {
      "get": {
        "summary": "Get Classes",
        "tags": [
          "Classes"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Classes list"
          }
        }
      },
      "post": {
        "summary": "Create Class",
        "tags": [
          "Classes"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Class created"
          }
        }
      }
    },
    "/api/classes/{id}": {
      "put": {
        "summary": "Update Class",
        "tags": [
          "Classes"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Class updated"
          }
        }
      },
      "delete": {
        "summary": "Delete Class",
        "tags": [
          "Classes"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Class deleted"
          }
        }
      }
    },
    "/api/homeworks": {
      "get": {
        "summary": "Get Homeworks",
        "tags": [
          "Homeworks"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Homeworks"
          }
        }
      },
      "post": {
        "summary": "Create Homework",
        "tags": [
          "Homeworks"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Homework created"
          }
        }
      }
    },
    "/api/attendance": {
      "get": {
        "summary": "Get Attendance Records",
        "tags": [
          "Attendance"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Attendance records"
          }
        }
      },
      "post": {
        "summary": "Record Attendance",
        "tags": [
          "Attendance"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Attendance recorded"
          }
        }
      }
    },
    "/api/store/packs": {
      "get": {
        "summary": "Get Available Store Blook Packs",
        "tags": [
          "Store"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Store packs"
          }
        }
      }
    },
    "/api/store/profile": {
      "get": {
        "summary": "Get Store Profile (Tokens, Points, Blooks)",
        "tags": [
          "Store"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Profile"
          }
        }
      }
    },
    "/api/store/open-pack": {
      "post": {
        "summary": "Open Blook Box/Pack",
        "tags": [
          "Store"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Opened pack result"
          }
        }
      }
    },
    "/api/store/equip-blook": {
      "post": {
        "summary": "Equip Blook Avatar",
        "tags": [
          "Store"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Equipped"
          }
        }
      }
    },
    "/api/productivity/chat": {
      "get": {
        "summary": "Get Channel Chat Messages",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Messages"
          }
        }
      },
      "post": {
        "summary": "Send Chat Message",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Message sent"
          }
        }
      }
    },
    "/api/productivity/slides": {
      "get": {
        "summary": "Get Slide Decks",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Slides"
          }
        }
      },
      "put": {
        "summary": "Save Slide Deck",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Saved"
          }
        }
      }
    },
    "/api/productivity/docs": {
      "get": {
        "summary": "Get Documents",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Documents"
          }
        }
      },
      "put": {
        "summary": "Save Document",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Saved"
          }
        }
      }
    },
    "/api/productivity/sheets": {
      "get": {
        "summary": "Get Spreadsheets",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Spreadsheets"
          }
        }
      },
      "put": {
        "summary": "Save Spreadsheet",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Saved"
          }
        }
      }
    },
    "/api/productivity/forms": {
      "get": {
        "summary": "Get Forms",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Forms"
          }
        }
      },
      "put": {
        "summary": "Save Form",
        "tags": [
          "Productivity"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Saved"
          }
        }
      }
    },
    "/api/leaves": {
      "get": {
        "summary": "Get Leaves",
        "tags": [
          "Leaves"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Leaves"
          }
        }
      },
      "post": {
        "summary": "Submit Leave Request",
        "tags": [
          "Leaves"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Submitted"
          }
        }
      }
    },
    "/api/leaves/{id}": {
      "put": {
        "summary": "Update Leave Status (Approve/Reject)",
        "tags": [
          "Leaves"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      }
    },
    "/api/announcements": {
      "get": {
        "summary": "Get Announcements",
        "tags": [
          "Announcements"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Announcements"
          }
        }
      },
      "post": {
        "summary": "Create Announcement",
        "tags": [
          "Announcements"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      }
    },
    "/api/announcements/{id}": {
      "delete": {
        "summary": "Delete Announcement",
        "tags": [
          "Announcements"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/api/notifications": {
      "get": {
        "summary": "Get User Notifications",
        "tags": [
          "Notifications"
        ],
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Notifications"
          }
        }
      }
    }
  }
};
