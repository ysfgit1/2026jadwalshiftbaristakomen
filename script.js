/* 
  Logika rotasi shift, filter interaktif, & kalkulasi otomatis ringkasan shift.
*/

// Konfigurasi Pola Rotasi P-S-OFF (3 Hari)
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Pola Rotasi 3 Hari:
// Pola 0: Yusuf Pagi, Ahmad Siang, Diki OFF
// Pola 1: Diki Pagi, Yusuf Siang, Ahmad OFF
// Pola 2: Ahmad Pagi, Diki Siang, Yusuf OFF
const ROTASI = [
  { pagi: "Yusuf", siang: "Ahmad", off: "Diki" },  // Target Kombinasi
  { pagi: "Diki",  siang: "Yusuf", off: "Ahmad" },
  { pagi: "Ahmad", siang: "Diki",  off: "Yusuf" }
];

// Generasi Data Otomatis untuk Bulan Terkait
function buatDataBulan(tahun, bulanIndex, polaAwalIndex) {
  const data = [];
  const jumlahHari = new Date(tahun, bulanIndex + 1, 0).getDate();

  for (let tgl = 1; tgl <= jumlahHari; tgl++) {
    const dateObj = new Date(tahun, bulanIndex, tgl);
    const namaHari = NAMA_HARI[dateObj.getDay()];
    
    // Menghitung indeks rotasi berurutan
    const rotasiIndex = (polaAwalIndex + (tgl - 1)) % 3;
    const shift = ROTASI[rotasiIndex];

    data.push({
      tgl: tgl,
      hari: namaHari,
      pagi: shift.pagi,
      siang: shift.siang,
      off: shift.off,
      isTarget: (shift.pagi === "Yusuf" && shift.siang === "Ahmad")
    });
  }
  return data;
}

// Data Jadwal per Bulan (Kontinuitas Rotasi Terjaga)
const dataJadwal = {
  oktober2026: {
    label: "PERIODE: OKTOBER 2026",
    list: buatDataBulan(2026, 9, 1) // 9 = Oktober (0-indexed)
  },
  november2026: {
    label: "PERIODE: NOVEMBER 2026",
    list: buatDataBulan(2026, 10, 2) // 10 = November
  },
  desember2026: {
    label: "PERIODE: DESEMBER 2026",
    list: buatDataBulan(2026, 11, 0) // 11 = Desember
  }
};

let filterAktif = 'all';

// Fungsi Render Tabel ke HTML
function renderTabel(keyBulan) {
  const tbody = document.getElementById("tbodyJadwal");
  if (!tbody) return;

  const dataBulan = dataJadwal[keyBulan].list;
  
  // Update Judul Header
  const elJudul = document.getElementById("judulPeriode");
  if (elJudul) elJudul.innerText = dataJadwal[keyBulan].label;

  let htmlRows = "";

  dataBulan.forEach(item => {
    const classHighlight = item.isTarget ? "class='highlight-row'" : "";
    
    htmlRows += `
      <tr ${classHighlight}>
        <td>${item.tgl}</td>
        <td>${item.hari}</td>
        <td>${item.pagi}</td>
        <td>${item.siang}</td>
        <td class="off">${item.off}</td>
      </tr>
    `;
  });

  tbody.innerHTML = htmlRows;
  
  // Terapkan ulang filter nama & hitung ulang ringkasan untuk bulan yang dipilih
  terapkanFilter();
  hitungRingkasanShift();
}

// Event handler saat dropdown bulan diubah
function gantiBulan() {
  const bulanPilihan = document.getElementById("selectBulan").value;
  renderTabel(bulanPilihan);
}

// Fungsi Filter Nama Barista
function filterJadwal(nama) {
  filterAktif = nama;
  updateActiveButton(event.target);
  terapkanFilter();
}

// Fungsi Filter Kombinasi Khusus
function filterKombinasiKhusus() {
  filterAktif = 'khusus';
  updateActiveButton(event.target);
  terapkanFilter();
}

// Eksekusi penyaringan baris tabel
function terapkanFilter() {
  const rows = document.querySelectorAll("#tbodyJadwal tr");

  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) return;

    const pagi = cells[2].innerText;
    const siang = cells[3].innerText;
    const off = cells[4].innerText;

    resetTextHighlight(cells);

    if (filterAktif === 'all') {
      row.style.display = "";
    } else if (filterAktif === 'khusus') {
      if (row.classList.contains("highlight-row")) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    } else {
      if (pagi === filterAktif || siang === filterAktif || off === filterAktif) {
        row.style.display = "";
        highlightCellText(cells[2], filterAktif);
        highlightCellText(cells[3], filterAktif);
        highlightCellText(cells[4], filterAktif);
      } else {
        row.style.display = "none";
      }
    }
  });
}

function updateActiveButton(targetButton) {
  if (!targetButton) return;
  const buttons = document.querySelectorAll(".btn-filter");
  buttons.forEach(btn => btn.classList.remove("active"));
  targetButton.classList.add("active");
}

function highlightCellText(cell, nama) {
  if (cell.innerText === nama) {
    cell.innerHTML = `<span class="text-highlight">${nama}</span>`;
  }
}

function resetTextHighlight(cells) {
  for (let i = 2; i <= 4; i++) {
    if (cells[i]) cells[i].innerHTML = cells[i].innerText;
  }
}

// Fungsi Hitung Ringkasan Shift Otomatis
function hitungRingkasanShift() {
  const rows = document.querySelectorAll("#tbodyJadwal tr");
  const summaryBody = document.getElementById("summaryBody");
  if (!summaryBody) return;

  const summaryData = {};

  rows.forEach(row => {
    const cells = row.cells;
    if (cells.length < 5) return;

    const cellPagi = cells[2].textContent.trim();
    const cellSiang = cells[3].textContent.trim();
    const cellOff = cells[4].textContent.trim();

    const tambahPoin = (namaStr, tipe) => {
      if (!namaStr) return;
      const names = namaStr.split(/[\n,]+/).map(n => n.trim());

      names.forEach(nama => {
        if (!nama) return;
        if (!summaryData[nama]) {
          summaryData[nama] = { pagi: 0, siang: 0, off: 0, totalKerja: 0 };
        }

        if (tipe === 'pagi') {
          summaryData[nama].pagi++;
          summaryData[nama].totalKerja++;
        } else if (tipe === 'siang') {
          summaryData[nama].siang++;
          summaryData[nama].totalKerja++;
        } else if (tipe === 'off') {
          summaryData[nama].off++;
        }
      });
    };

    tambahPoin(cellPagi, 'pagi');
    tambahPoin(cellSiang, 'siang');
    tambahPoin(cellOff, 'off');
  });

  // Render hasil ke tabel ringkasan
  summaryBody.innerHTML = "";
  Object.keys(summaryData).sort().forEach(nama => {
    const data = summaryData[nama];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: left; font-weight: bold; padding-left: 8px;">${nama}</td>
      <td style="text-align: center;">${data.pagi}</td>
      <td style="text-align: center;">${data.siang}</td>
      <td style="text-align: center;">${data.off}</td>
      <td style="text-align: center;"><strong>${data.totalKerja} Hari</strong></td>
    `;
    summaryBody.appendChild(tr);
  });
}

// Inisialisasi awal saat halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
  renderTabel("oktober2026");

  // Kontrol Audio Player (Matikan audio lain saat diputar)
  const allAudios = document.querySelectorAll("audio");
  allAudios.forEach(audio => {
    audio.addEventListener("play", function() {
      allAudios.forEach(otherAudio => {
        if (otherAudio !== audio) {
          otherAudio.pause();
        }
      });
    });
  });
});
