function setLastOnline() {
    let username = document.getElementsByName('my-username')[0].value;
    let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
    axios({
        method: 'post',
        url: '/set-last-online',
        headers: {
            'X-CSRFToken': csrf_token
        },
        data: {
            username: username
        }
    }).then(function (response) {
    });
}

setLastOnline();
