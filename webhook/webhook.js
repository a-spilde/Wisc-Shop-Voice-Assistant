const express = require("express");
const { WebhookClient } = require("dialogflow-fulfillment");
const app = express();
const fetch = require("node-fetch");
const base64 = require("base-64");
const { info } = require("actions-on-google/dist/common");

let username = "";
let password = "";
let token = "";
let id = -1;

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = "";
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000";
} else {
  ENDPOINT_URL = "http://cs571.cs.wisc.edu:5000";
}

async function getToken() {
  let request = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + base64.encode(username + ":" + password),
    },
  };

  const serverReturn = await fetch(ENDPOINT_URL + "/login", request);
  const serverResponse = await serverReturn.json();
  token = serverResponse.token;

  return token;
}

app.get("/", (req, res) => res.send("online"));
app.post("/", express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function welcome() {
    agent.add("Webhook works!");
    console.log(ENDPOINT_URL);
  }

  async function login() {
    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username;
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password;
    await getToken();

    if (token) {
      agent.add("Success!")

      url = "http://cs571.cs.wisc.edu:5000/application/messages"

      await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-access-token': token
        },
      });

      await addMessages(-1, "You are now logged in as " + username)

    }
    else {
      agent.add("Fail!")
    }


  }

  async function categories() {

    await addMessages(agent.query, "There are bottoms, hats, leggings, plushes, sweatshirts, and tees")
  }



  async function cartQuery() {

    url = "http://cs571.cs.wisc.edu:5000/application/products"

    p = []

    await fetch(url, {
      method: 'GET',
      headers: {
        'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        // r = res.tags
        console.log(res)
        p = res.products
      })

    cnt = 0;
    cost = 0;
    pInfo = []

    for (let i = 0; i < p.length; i++) {
      arr = []
      arr.push(p[i].name)
      arr.push(p[i].count)
      arr.push(p[i].price)
      pInfo.push(arr)

    }

    console.log(pInfo)

    await addMessages(agent.query, -1)

    for (let i = 0; i < pInfo.length; i++) {
      await addMessages(-1, "You have " + pInfo[i][1] + " " + pInfo[i][0])
      cnt += (pInfo[i][2] * pInfo[i][1])
    }

    await addMessages(-1, "... and your cart total is $" + cnt)

  }

  async function categoryTagsQuery() {

    cat = agent.parameters.category

    url = "http://cs571.cs.wisc.edu:5000/categories/" + cat + "/tags"
    r = [];

    await fetch(url, {
      method: 'GET',
      headers: {
        // 'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        r = res.tags
      })

    s = ""
    for (let i = 0; i < r.length; i++) {
      if (i == r.length - 1) {
        s += "and " + r[i]
      }
      else {
        s += r[i] + ", "
      }

    }

    await addMessages(agent.query, "The tags for " + cat + " are: " + s)
  }

  async function productQuery() {

    url = "http://cs571.cs.wisc.edu:5000/products"

    pName = agent.parameters.product

    if (pName == 'that' && agent.context.get('current-product').parameters.name != null) {
      pName = agent.context.get('current-product').parameters.name;
    }
    
    pid = -1
    pDesc = ""
    pPrice = -1
    products = []

    await fetch(url, {
      method: 'GET',
      headers: {
        // 'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        // r = res.tags
        console.log(res)
        products = res.products
        // p = res.products
      })

    for (let i = 0; i < products.length; i++) {
      currP = products[i]
      if (currP.name == pName) {
        pid = currP.id
        pDesc = currP.description
        pPrice = currP.price
        break;
      }
    }

    url = "http://cs571.cs.wisc.edu:5000/products/" + pid + "/reviews"
    reviews = [];

    await fetch(url, {
      method: 'GET',
      headers: {
        // 'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        // r = res.tags
        // console.log(res)
        reviews = res.reviews
        // p = res.products
      })

    await addMessages(agent.query, -1)
    await addMessages(-1, "It has a price of " + pPrice + " dollars")
    await addMessages(-1, "The description is: " + pDesc)

    pRating = 0;
    numRating = reviews.length;

    if (numRating > 0) {
      await addMessages(-1, "Here are the reviews:")
    }

    for (let i = 0; i < reviews.length; i++) {
      rev = i + 1
      await addMessages(-1, "Review number " + rev + " - " + reviews[i].title + ": ")
      await addMessages(-1, reviews[i].text)
      // console.log(typeof(reviews.stars))
      pRating += parseInt(reviews[i].stars)
    }

    if (numRating != 0) {

      await addMessages(-1, "The average rating of " + pName + " is " + pRating / numRating + " out of 5 stars")
    }

    console.log("PRODUCTS:")
    console.log(pRating)


  }

  async function navigate() {

    page = agent.parameters.page
    await addMessages(agent.query, "Navigating to " + page)

    prodArr = ["Women's Wisconsin Cuddle Joggers",
      "Wisconsin Sweatpants",
      "Wisconsin Qualifier Woven Short",
      "Wisconsin Running Shorts",
      "Wisconsin Football Hat",
      "White Wisconsin Visor",
      "Wisconsin Leggings",
      "Bucky Badger Leggings",
      "Bucky Badger Plush",
      "Game Day Bucky Plush",
      "W Cloud Pillow",
      "Bucky Badger Pillow",
      "Bucky Badger Keychain",
      "Bucky Crew Neck Sweatshirt",
      "150 Year Commemorative Hoodie",
      "Jump Around Shirt"]

    catArr = ["bottoms", "bottoms", "bottoms", "bottoms", "hats", "hats", "leggings", "leggings", "plushes", "plushes", "plushes", "plushes", "plushes", "sweatshirts", "sweatshirts", "tees"]

    idArr = [14, 15, 16, 17, 10, 11, 4, 6, 3, 5, 7, 8, 9, 2, 13, 12]

    if (page != "signUp" && page != "signIn") {
      url = "/" + username
      if (prodArr.includes(page)) {
        for (let i = 0; i < prodArr.length; i++) {
          if (prodArr[i] == page) {
            url += "/" + catArr[i] + "/products/" + idArr[i]
            agent.context.set({
              'name':'current-product',
              'lifespan': 5,
              'parameters':{
              'name':prodArr[i]
              }
             });
          }
        }
      }
      else if (page != "home") {
        url += "/" + page
      }
    }
    else if (page == "signUp") {
      url = "/signUp"
    }
    else if (page == "signIn") {
      url = "/signIn"
    }



    await fetch("http://cs571.cs.wisc.edu:5000/application", {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        page: url
      })
    });



  }

  async function addMessages(a, b) {
    console.log("addMessages called")

    url = "http://cs571.cs.wisc.edu:5000/application/messages"
    url1 = "http://cs571.cs.wisc.edu:5000/application/messages/" + ++id
    url2 = "http://cs571.cs.wisc.edu:5000/application/messages/" + ++id

    d = new Date()
    d = d.toISOString()

    console.log(url1)
    console.log(url2)
    console.log(d)
    console.log(a)
    console.log(b)

    if (a != -1) {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({
          "date": d,
          "isUser": true,
          'text': "" + a,
          'id': id
        })
      })
    }



    if (b != -1) {
      agent.add("" + b)
      await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({
          'date': d,
          'isUser': false,
          'text': "" + b,
          'id': id
        })
      })
    }



  }

  function test() {
    console.log("test called")
    agent.add("test called")
  }

  async function filterTags() {


    tag = "" + agent.parameters.tag
    await addMessages(agent.query, "Filtering by " + tag)

    tagArr = []
    tagArr.push(tag)

    await fetch("http://cs571.cs.wisc.edu:5000/application/tags/" + tag, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        tags: tagArr,
      })
    })

  }

  async function addToCart() {

    adder = agent.parameters.product

    if (pName == 'that' && agent.context.get('current-product').parameters.name != null) {
      console.log(agent.context.get('current-product').parameters.name)
      adder = agent.context.get('current-product').parameters.name;
    }

    num = agent.parameters.number;
    if (num == null) {
      num = 1
    }

    await addMessages(agent.query, "Adding " + num + " " + adder + " to cart")

    pid = -1;
    url = "http://cs571.cs.wisc.edu:5000/products"



    await fetch(url, {
      method: 'GET',
      headers: {
        // 'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        // r = res.tags
        // console.log(res)
        products = res.products
        // p = res.products
      })
    for (let i = 0; i < products.length; i++) {
      currP = products[i]
      if (currP.name == adder) {
        pid = currP.id
        adder = currP
        break;
      }
    }



    url = "http://cs571.cs.wisc.edu:5000/application/products/" + pid


    for (let i = 0; i < num; i++) {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({
          products: adder,
        })
      })
    }



  }

  async function removeFromCart() {

    adder = agent.parameters.product

    if (pName == 'that' && agent.context.get('current-product').parameters.name != null) {
      adder = agent.context.get('current-product').parameters.name;
    }

    num = agent.parameters.number;
    if (num == null) {
      num = 1
    }


    await addMessages(agent.query, "Removing " + num + " " + adder + " from your cart")

    pid = -1;
    url = "http://cs571.cs.wisc.edu:5000/products"



    await fetch(url, {
      method: 'GET',
      headers: {
        // 'x-access-token': token
      }
    }).then(res => res.json())
      .then(res => {
        // r = res.tags
        // console.log(res)
        products = res.products
        // p = res.products
      })
    for (let i = 0; i < products.length; i++) {
      currP = products[i]
      if (currP.name == adder) {
        pid = currP.id
        adder = currP
        break;
      }
    }



    url = "http://cs571.cs.wisc.edu:5000/application/products/" + pid


    for (let i = 0; i < num; i++) {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-access-token': token
        },
      });
    }



  }

  async function clearCart() {


    pidArr = []
    products = []

    await addMessages(agent.query, "Clearing your cart")

    await fetch("http://cs571.cs.wisc.edu:5000/application/products", {
      method: 'DELETE',
      headers: {
        'x-access-token': token
      },
    });


  }

  async function reviewCart() {


    await addMessages(agent.query, "Here's what your cart looks like")

    url = "/" + username

    url += "/cart-review"

    await fetch("http://cs571.cs.wisc.edu:5000/application", {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        page: url
      })
    });



  }

  async function confirmCart() {
    await addMessages(agent.query, "Your cart has been confirmed")

    url = "/" + username + "/cart-confirmed"

    await fetch("http://cs571.cs.wisc.edu:5000/application", {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        page: url
      })
    });

  }



  async function back() {

    await addMessages(agent.query, "Back to the previous page")

    await fetch("http://cs571.cs.wisc.edu:5000/application", {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({
        back: true
      })
    });
  }

  let intentMap = new Map();
  intentMap.set("CategoryTagsQuery", categoryTagsQuery);
  intentMap.set("Default Welcome Intent", welcome);
  intentMap.set("Login", login);
  intentMap.set("Categories", categories);
  intentMap.set("CartQuery", cartQuery);
  intentMap.set("ProductQuery", productQuery);
  intentMap.set("Navigate", navigate);
  intentMap.set("FilterTags", filterTags);
  intentMap.set("CartAdd", addToCart);
  intentMap.set("CartDelete", removeFromCart);
  intentMap.set("CartClear", clearCart);
  intentMap.set("ReviewCart", reviewCart);
  intentMap.set("ConfirmCart", confirmCart);
  intentMap.set("GoBack", back);

  agent.handleRequest(intentMap);
});

app.listen(process.env.PORT || 8080);
