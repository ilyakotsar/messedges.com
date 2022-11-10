const room_name = document.getElementById('room-name').value;
const my_username = document.getElementById('my-username').value;
const p = document.getElementById('p').value;
const recipient_public_key = document.getElementById('recipient-public-key').value;
const senders = JSON.parse(document.getElementById('senders').textContent);
const texts = JSON.parse(document.getElementById('texts').textContent);
const sent = JSON.parse(document.getElementById('sent').textContent);
const csrf_token = document.getElementById('csrf-token').value;
let last_sent = document.getElementById('last-sent').value;
let available_length = document.getElementById('available-length').value;
let private_key = '';
let secret_key = '';
let allow_get_messages = false;

if (texts.length > 0) {
    for (let i = 0; i < texts.length; i++) {
        if (senders[i] == my_username) {
            document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + texts[i] + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
        }
        else {
            document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + texts[i] + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
        }
    }
}

setInterval(getMessages, 2000);
window.onbeforeunload = function() {
    if (secret_key.length > 0) {
        return '';
    }
}
window.scrollTo(0, document.body.scrollHeight);

function enterPrivateKey() {
    if (allow_get_messages == false) {
        private_key = document.getElementById('private-key').value;
        if (private_key.length > 0) {
            let private_key_number = passwordToNumber(private_key);
            secret_key = bigInt(recipient_public_key).modPow(private_key_number, p).toString();
            if (texts.length > 0) {
                for (let i = 0; i < texts.length; i++) {
                    let ciphertext = texts[i];
                    let bytes  = CryptoJS.AES.decrypt(ciphertext, secret_key);
                    let plaintext = bytes.toString(CryptoJS.enc.Utf8);
                    if (plaintext.length > 0) {
                        if (i == 0) {
                            document.getElementById('chat-body').innerHTML = '';
                        }
                        if (senders[i] == my_username) {
                            document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + plaintext + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                        }
                        else {
                            document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + plaintext + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                        }
                        document.getElementById('lock-btn').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
                        document.getElementById('lock-btn').className = 'btn btn-nav text-success';
                        allow_get_messages = true;
                        window.scrollTo(0, document.body.scrollHeight);
                    }
                    else {
                        secret_key = '';
                    }
                }
            }
            else {
                document.getElementById('lock-btn').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
                document.getElementById('lock-btn').className = 'btn btn-nav text-success';
                allow_get_messages = true;
            }
        }
    }
    else {
        if (texts.length > 0) {
            document.getElementById('private-key').value = private_key;
        }
        else {
            private_key = document.getElementById('private-key').value;
            if (private_key.length > 0) {
                let private_key_number = passwordToNumber(private_key);
                secret_key = bigInt(recipient_public_key).modPow(private_key_number, p).toString();
            }
        }
    }
}

function sendMessage() {
    if (secret_key.length > 0) {
        getMessages();
        let message = document.getElementById('message').value;
        if (message.trim() != '') {
            let ciphertext = CryptoJS.AES.encrypt(message, secret_key).toString();
            if (ciphertext.length <= available_length) {
                axios({
                    method: 'post',
                    url: '/rooms/' + room_name,
                    headers: {'X-CSRFToken': csrf_token},
                    data: {
                        new_text: ciphertext
                    }
                })
                .then(function (response) {
                    document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + message + '<div class="text-end muted-color"><small>' + response.data['sent'] + '</small></div></div></div>';
                    document.getElementById('message').value = '';
                    available_length -= ciphertext.length;
                    window.scrollTo(0, document.body.scrollHeight);
                });
            }
            else {
                alert('Limit is exceeded');
            }
        }
        else {
            document.getElementById('message').value = '';
        }
    }
    else {
        $('#private-key-modal').modal('show');
    }
}

function getMessages() {
    if (allow_get_messages == true) {
        axios({
            method: 'post',
            url: '/rooms/' + room_name,
            headers: {'X-CSRFToken': csrf_token},
            data: {
                last_sent: last_sent
            }
        })
        .then(function (response) {
            if (response.data['texts']) {
                if (response.data['texts'].length > 0) {
                    for (let i = 0; i < response.data['texts'].length; i++) {
                        let ciphertext = response.data['texts'][i];
                        let bytes  = CryptoJS.AES.decrypt(ciphertext, secret_key);
                        let plaintext = bytes.toString(CryptoJS.enc.Utf8);
                        document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + plaintext + '<div class="text-end muted-color"><small>' + response.data['sent'][i] + '</small></div></div></div>';
                    }
                    last_sent = response.data['last_sent'];
                    if (!('Notification' in window)) {
                    }
                    else if (Notification.permission === 'granted') {
                        let n = new Notification('New message');
                    }
                    else if (Notification.permission !== 'denied') {
                        Notification.requestPermission(function (permission) {
                            if (permission === 'granted') {
                                let n = new Notification('New message');
                            }
                        });
                    }
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }
        });
    }
}

function passwordToNumber(password) {
    let number = '';
    for (let i = 0; i < password.length; i++) {
        let char_code = password[i].charCodeAt();
        number += char_code.toString();
    }
    return number;
}

document.querySelector('#message').onkeyup = function(e) {
    if ($('#private-key-modal').is(':visible') == false) {
        if (e.keyCode == 13) {
            document.getElementById('send-message').click();
        }
    }
}

document.querySelector('#private-key').onkeyup = function(e) {
    if ($('#private-key-modal').is(':visible') == true) {
        if (e.keyCode == 13) {
            document.getElementById('enter-private-key').click();
        }
    }
}
