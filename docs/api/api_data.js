define({ "api": [
  {
    "type": "post",
    "url": "/createuser",
    "title": "creates user.",
    "version": "1.0.0",
    "name": "CreateUser",
    "group": "Userservice",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "phonenr",
            "description": "<p>Users phonenr.</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Users password.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "profile",
            "description": "<p>User profile information.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"success\": \"true\",\n \"userid\": \"467684352423\" \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"success\": \"false\",\n  \"msg\": \"No data found.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "src/routes.js",
    "groupTitle": "Userservice"
  },
  {
    "type": "get",
    "url": "/info",
    "title": "Greeting from server",
    "version": "1.0.0",
    "name": "GetInfo",
    "group": "Userservice",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "Greeting",
            "description": "<p>from server.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n  \"Welcome to the user service\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "src/routes.js",
    "groupTitle": "Userservice"
  },
  {
    "type": "get",
    "url": "/getuser",
    "title": "Get user.",
    "version": "1.0.0",
    "name": "GetUser",
    "group": "Userservice",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "access-key",
            "description": "<p>Users unique access-key.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "profile",
            "description": "<p>User profile information.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n User{\n      phonenr: '+4794055182',\n      password: 'dummypassword''\n     } \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 404 Not Found\n{\n  \"error\": \"No data found.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "src/routes.js",
    "groupTitle": "Userservice"
  },
  {
    "type": "post",
    "url": "/login",
    "title": "login user.",
    "version": "1.0.0",
    "name": "LoginUser",
    "group": "Userservice",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "phonenr",
            "description": "<p>Users phonenr.</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Users password.</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "User",
            "description": "<p>token.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n \"success\": \"true\",\n \"token\": \" 834098932490483290\",\n \"msg\": \"User authenticated\" \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 401 OK\n{\n  \"success\": \"false\",\n  \"msg\": \"Authentication failed.\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "src/routes.js",
    "groupTitle": "Userservice"
  }
] });
