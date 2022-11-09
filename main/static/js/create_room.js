function createRoom() {
    let private_key = document.getElementById('private-key').value;
    if (private_key.length > 0) {
        let g = createRandomNumber(1000);
        let p = createRandomNumber(5000);
        let private_key_number = passwordToNumber(private_key);
        let public_key = bigInt(g).modPow(private_key_number, p).toString();
        let username = document.getElementById('username').value;
        const csrf_token = document.getElementById('csrf-token').value;
        axios({
            method: 'post',
            url: '/rooms/new',
            headers: {'X-CSRFToken': csrf_token},
            data: {
                g: g,
                p: p,
                username: username,
                public_key: public_key
            },
        })
        .then(function (response) {
            if (response.data['success'] == true) {
                window.location.replace('https://messedges.com/rooms');
            } else if (response.data['error'] == true) {
                alert('Error')
            }
        });
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
        document.getElementById('create-room').click();
    }
}