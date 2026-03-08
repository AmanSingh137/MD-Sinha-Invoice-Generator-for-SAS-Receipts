async function upload() {

    const file = document.getElementById("pdfFile").files[0];

    const formData = new FormData();

    formData.append("pdf", file);

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    document.getElementById("output").innerText =
        JSON.stringify(data, null, 2);

}