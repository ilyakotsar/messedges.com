function inputLength(input_id, length_id) {
    let input = document.getElementById(input_id).value;
    let length = document.getElementById(length_id);
    if (input.length > 0) {
        length.innerHTML = ' = ' + input.length;
    } else {
        length.innerHTML = '';
    }
}
