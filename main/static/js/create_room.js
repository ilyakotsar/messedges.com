function createParameters() {
    let g = createRandomNumber(1000);
    let p = createRandomNumber(5000);
    document.getElementById('g').value = g;
    document.getElementById('p').value = p;
}

function createPublicKey() {
    let private_key = document.getElementById('private-key').value;
    if (private_key.length > 9) {
        let g = document.getElementById('g').value;
        let p = document.getElementById('p').value;
        let private_key_number = passwordToNumber(private_key);
        let public_key = bigInt(g).modPow(private_key_number, p).toString();
        document.getElementById('public-key').value = public_key;
        document.getElementById('private-key').value = '';
        document.getElementById('private-key-length').innerHTML = '';
    } else {
        document.getElementById('public-key').value = '';
    }
}

function createRoom() {
    let public_key = document.getElementById('public-key').value;
    let username = document.getElementById('username').value;
    if (public_key.length > 4990 && username.length > 4) {
        let g = document.getElementById('g').value;
        let p = document.getElementById('p').value;
        let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
        axios({
            method: 'post',
            url: '/rooms/new',
            headers: {
                'X-CSRFToken': csrf_token
            },
            data: {
                username: username,
                public_key: public_key,
                g: g,
                p: p
            }
        }).then(function (response) {
            if (response.data['success'] == true) {
                window.location.replace('https://messedges.com/rooms');
            } else if (response.data['error'] == true) {
                alert('Error')
            }
        });
    }
}

function getUsernames() {
    let username_search = document.getElementById('username').value;
    let username_list = document.getElementById('username-list');
    if (username_search.trim() != '') {
        let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
        axios({
            method: 'post',
            url: '/rooms/new',
            headers: {
                'X-CSRFToken': csrf_token
            },
            data: {
                username_search: username_search
            }
        }).then(function (response) {
            username_list.innerHTML = '';
            let usernames = response.data['usernames'];
            for (let i = 0; i < usernames.length; i++) {
                let option = document.createElement('option');
                option.value = usernames[i];
                username_list.appendChild(option);
            }
        });
    } else {
        username_list.innerHTML = '';
    }
}

function createRandomNumber(length) {
    let number = '';
    while (number.length != length) {
        for (let i = 0; i < length; i++) {
            number += Math.floor(Math.random() * 10);
        }
    }
    return number;
}

function passwordToNumber(password) {
    let number = '';
    for (let i = 0; i < password.length; i++) {
        let char_code = password[i].charCodeAt();
        number += char_code.toString();
    }
    return number;
}

document.querySelector('#private-key').onkeyup = function(event) {
    if (event.keyCode == 13) {
        document.getElementById('create-public-key').click();
    }
}

createParameters();
