document.addEventListener("DOMContentLoaded", function () {
  // Get the csrf cookie (taken from the Django documentation)
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Create the HTML to represent a post and append to the DOM
  function add_post(post) {
    const postDiv = document.createElement("div");
    const postBody = document.createElement("div");
    const postUsername = document.createElement("button");
    const postContent = document.createElement("p");
    const likeBtn = document.createElement("button");

    postUsername.className = "profile-name btn fw-bold text-decoration-none";
    postUsername.innerHTML = post.user;
    postContent.className = "card-text px-2";
    postContent.innerHTML = post.content;
    postDiv.className = "card my-2";
    postDiv.dataset.id = post.id;
    postBody.className = "card-body p-2";
    likeBtn.className = "btn btn-sm like-btn btn-outline-danger";
    likeBtn.innerHTML = `${Object.keys(post.likes).length} &#9829;`;
    postDiv.innerHTML = `<div class="card-header text-white fw-light">
                             ${post.timestamp}
                             </div>`;

    postBody.append(postUsername);
    postBody.append(postContent);
    postDiv.append(postBody);
    postBody.append(likeBtn);

    // Add an edit button to the user's own posts
    if (currentUser == post.user) {
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-sm btn-outline-secondary";
      editBtn.innerHTML = "Edit";
      postBody.append(editBtn);
      editBtn.addEventListener("click", (event) =>
        edit_post(post.id, event)
      );
    }

    document.querySelector("#posts-view").append(postDiv);
    postDiv.style.animationPlayState = "running";

    // Load the profile when a username is clicked
    postUsername.addEventListener("click", (event) => {
      const user = event.target.innerHTML;
      load_posts("profile", 1, user);
      load_profile(user);
      get_buttons("profile", user);
      set_active(event, "links")
    });

    // Like a post when the like button is clicked
    likeBtn.addEventListener("click", (event) => like_post(post.id, event));
  }

  // Load posts depending on the filter - all, following, profile
  function load_posts(filter, page, user) {
    document.querySelector("#posts-view").innerHTML = "";

    fetch(`/posts/${filter}?page=${page}&user=${user}`)
      .then((response) => response.json())
      .then((posts) => {
        if (posts.error) {
          const errorMsg = document.createElement("div");
          errorMsg.className = "text-center py-5";
          errorMsg.innerHTML = posts.error;
          document.querySelector("#posts-view").append(errorMsg);
        } else {
          posts.forEach(add_post);
        }
      });
  }

  async function submit_post() {
    await fetch("/posts", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        content: document.querySelector(".compose-content").value,
      }),
    });
    load_posts("all", 1);
    get_buttons("all");
    document.querySelector(".compose-content").value = "";

    return false;
  }

  function like_post(postId, event) {
    const button = event.target;
    fetch("/post/" + postId, {
      method: "PUT",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        like: true,
      }),
    })
      .then((response) => response.json())
      .then((post) => {
        button.innerHTML = "";
        button.innerHTML = `${post.likes} &hearts;`;
      });
  }

  // Try putting func declarations outside the DOMContentLoaded?
  // try the current function, otherwise try async function:
  // const response = await fetch
  // const data = await response.json()
  // button.innerHtml = data.buttonText

  async function follow_button(event) {
    const button = event.target;
    const user = button.dataset.user;

    await fetch("/profile/" + user, {
      method: "PUT",
      headers: { "X-CSRFToken": csrftoken },
      body: JSON.stringify({
        follow: user,
      }),
    })
      .then((response) => response.json())
      .then((user) => {
        document.querySelector(
          ".followers"
        ).innerHTML = `Followers: ${user.followers}`;
        document.querySelector(
          ".following"
        ).innerHTML = `Following: ${user.following}`;
        button.innerHTML = user.buttonText;
      });
  }

  function edit_post(postId, event) {
    const textArea = document.createElement("textarea");
    const cardBody = event.target.parentElement;
    const card = cardBody.parentElement;
    const cancelBtn = document.createElement("button");
    const saveBtn = document.createElement("button");
    const cardElements = cardBody.children;
    const cardText = cardElements[1];

    textArea.innerHTML = cardText.innerHTML;
    cancelBtn.className = "btn btn-sm btn-outline-secondary";
    cancelBtn.innerHTML = "Cancel";
    saveBtn.className = "btn btn-sm btn-outline-primary";
    saveBtn.innerHTML = "Save";

    cardBody.style.display = "none";
    card.append(textArea);
    card.append(saveBtn);
    card.append(cancelBtn);

    cancelBtn.addEventListener("click", () => {
      textArea.remove();
      saveBtn.remove();
      cancelBtn.remove();
      cardBody.style.display = "block";
    });

    saveBtn.addEventListener("click", () => {
      fetch("/posts", {
        method: "PUT",
        headers: { "X-CSRFToken": csrftoken },
        body: JSON.stringify({
          content: textArea.value,
          postId: postId,
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          cardText.innerHTML = result.content;
          textArea.remove();
          saveBtn.remove();
          cancelBtn.remove();
          cardBody.style.display = "block";
        });
    });
  }

  // Display the correct number of buttons
  function get_buttons(filter, user) {
    document.querySelector("#buttons-view").innerHTML = "";
    fetch(`/posts/${filter}?pages="request"&user=${user}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.pages > 1) {
          const buttonDiv = document.createElement("ul");
          buttonDiv.id = "page-buttons";
          buttonDiv.className = "pagination d-flex justify-content-center";
          document.querySelector("#buttons-view").append(buttonDiv);
          const previousBtn = document.createElement("li");
          previousBtn.innerHTML = "<<";
          previousBtn.className = "flex page-link";
          previousBtn.style.display = "none";
          const nextBtn = document.createElement("li");
          nextBtn.innerHTML = ">>";
          nextBtn.className = "flex page-link";

          previousBtn.addEventListener("click", (event) => {
            currentPage--;
            if (currentPage == 1) {
              previousBtn.style.display = "none";
            } else {
              previousBtn.style.display = "block";
              if (currentPage < result.pages) {
                nextBtn.style.display = "block";
              }
            }
            load_posts(filter, currentPage, user);
            set_active(event, "buttons");
          });

          nextBtn.addEventListener("click", (event) => {
            currentPage++;
            if (currentPage < result.pages) {
              nextBtn.style.display = "block";
              if (currentPage > 1) {
                previousBtn.style.display = "block";
              }
            } else {
              nextBtn.style.display = "none";
            }
            load_posts(filter, currentPage, user);
            set_active(event, "buttons");
          });

          for (var i = 1; i <= result.pages; i++) {
            const page = i;
            const pageBtn = document.createElement("li");
            pageBtn.innerHTML = page;
            pageBtn.className = "flex page-link";
            pageBtn.dataset.pageNum = `page${i}`;
            pageBtn.addEventListener("click", (event) => {
              const page = event.target.innerHTML;
              currentPage = page;
              if (page > 1) {
                previousBtn.style.display = "block";
              } else {
                previousBtn.style.display = "none";
              }
              if (page < result.pages) {
                nextBtn.style.display = "block";
              } else {
                nextBtn.style.display = "none";
              }

              load_posts(filter, page, user);
              set_active(event, "buttons");
            });

            buttonDiv.append(pageBtn);
          }
          buttonDiv.prepend(previousBtn);
          buttonDiv.append(nextBtn);
          const page1 = document.querySelector(`[data-page-num="page1"]`);
          page1.className += " active";
          buttonDiv.style.animationPlayState = "running";
        }
      });
  }

  // Display which page is active
  function set_active(event, filter) {
    const pageButtons = document.querySelector(`#page-${filter}`) 
    const ActivePage = pageButtons.querySelector(".active");
    if (ActivePage) {
      ActivePage.className = ActivePage.className.replace(" active", "");
    }
    event.target.className += " active";
  }

  function load_profile(username) {
    document.querySelector("#compose-view").style.display = "none";
    document.querySelector("#profile-view").style.display = "block";
    fetch(`/profile/${username}`)
      .then((response) => response.json())
      .then((user) => {
        document.querySelector("#profile-view").innerHTML = "";
        const profileDiv = document.createElement("div");
        const profileName = document.createElement("p");
        const followers = document.createElement("div");
        const following = document.createElement("div");

        profileDiv.className = "text-center profile-div p-4";
        profileName.className = "profile-name fw-bold fs-4";
        profileName.innerHTML = user.username;
        followers.className = "followers";
        followers.innerHTML = `Followers: ${user.followers}`;
        following.className = "following";
        following.innerHTML = `Following: ${user.following}`;

        document.querySelector("#profile-view").append(profileDiv);
        profileDiv.append(profileName);
        profileDiv.append(following);
        profileDiv.append(followers);

        if (currentUser != user.username) {
          const followBtn = document.createElement("button");
          followBtn.className = "btn btn-sm btn-primary mt-2";
          followBtn.dataset.user = user.username;
          followBtn.innerHTML = user.buttonText;
          followBtn.addEventListener("click", (event) => {
            if (currentUser === "") {
              alert("Create an account or log in to follow users", "primary");
            } else {
              follow_button(event);
            }
          });
          profileDiv.append(followBtn);
        }
      });
  }

  // Change this so it doesn't load on other HTML templates? Or maybe
  // it only loads once? If so, just need to add it to the home button on the nav
  // Does it not run when reloading a different page, like profile page?
  var currentPage = 1;
  const csrftoken = getCookie("csrftoken");
  const currentUser = JSON.parse(
    document.getElementById("current_user").textContent
  );

  /*
  // Add active class to active nav links
  const navBar = document.querySelector(".nav-pills");
  const navLinks = navBar.getElementsByClassName("nav-link");

  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener("click", (event) => {
      var current = document.getElementsByClassName("nav-link active");
      current[0].className = current[0].className.replace(" active", "");
      event.target.className += " active";
    });
  } */

  // Creating an alert to display when a user isn't logged in
  const alert = (message, type) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = [
      `<div class="alert alert-${type} alert-dismissible fade show text-center mx-5" role="alert">`,
      `   <div>${message}</div>`,
      '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
      "</div>",
    ].join("");
    document.querySelector(".alert-col").innerHTML = "";
    document.querySelector(".alert-col").append(wrapper);
  };

  // Load the first page of posts when the webpage first loads
  document.querySelector("#profile-view").style.display = "none";
  load_posts("all", 1);
  get_buttons("all");

  // By default, submit post button is disabled
  document.querySelector("#submit").disabled = true;

  // Enable button only if there is text in the input field
  document.querySelector(".compose-content").onkeyup = () => {
    if (document.querySelector(".compose-content").value.length > 0) {
      document.querySelector("#submit").disabled = false;
    } else {
      document.querySelector("#submit").disabled = true;
    }
  };

  // Submit a post
  document.querySelector(".compose-form").onsubmit = (event) => {
    event.preventDefault();
    if (currentUser === "") {
      alert("Log in or create an account to post", "primary");
      console.log("You are not logged in");
    } else {
      submit_post();
    }
    document.querySelector("#submit").disabled = true;
  };

  const allPosts = document.querySelector("#all-posts");
  allPosts.className += " active";
  /*allPosts.addEventListener("click", (event) => {
    //event.preventDefault();
    document.querySelector("#profile-view").style.display = "none";
    document.querySelector("#compose-view").style.display = "block";

    load_posts("all", 1);
    get_buttons("all");
  });*/

  if (currentUser != "") {
    document
      .querySelector("#following-posts")
      .addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelector("#profile-view").style.display = "none";
        document.querySelector("#compose-view").style.display = "none";
        load_posts("following", 1);
        get_buttons("following");
        set_active(event, "links")
      });

    document
      .querySelector(".profile-name")
      .addEventListener("click", (event) => {
        event.preventDefault();
        const user = event.target.innerHTML;
        load_posts("profile", 1, user);
        load_profile(user);
        get_buttons("profile", user);
        set_active(event, "links")
      });
  }
});
