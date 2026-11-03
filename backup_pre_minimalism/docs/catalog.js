/**
 * MUSYA & KETI: INFINITE GALLERY - Catalog Module (JavaScript ES6+)
 * Manages the Catalog of Saved Exhibits with sequential short numbers (e.g. EXHIBIT #000000001),
 * title annotations, persistence via localStorage, and dual search (By Full ID and By Short Number).
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'musya_keti_custom_catalog';

  // Canonical Seed Exhibits for the Musya & Keti Digital Museum
  const SEED_EXHIBITS = [
    {
      number: 1,
      title_ru: 'Муся • Хранительница Пространства (32×32)',
      title_en: 'Musya • Guardian of Space (32×32)',
      id: (global.CAT_EXHIBITS && global.CAT_EXHIBITS.musya) ? global.CAT_EXHIBITS.musya.id_32 : 'b32_C2hodVzYn66FcdkfKPjTwYC89ruZs4rtgD0_SZ0bpfaXFvsFDXXEUUT04pwTsxFaCD6oqCHamARBjyTE0umNh3B8rnhfa4cLn-xVzcBksEPQmVMhMAf448pp243tapOsa8TxWJZq6Xq5HwNvmf5NdiFrTHGHGM4fROZyHCkd0Kzp1VaAumIAr0m_7XtGpouylTojTk3gBX8keKM6Bu7tMkBaO1aCDCWYEKmuTkkH1aGwLNRB6-cqdtBdedR6h4JGICYrToA2lUKaP3fPyHLq8cvPnisvgs25u_TosgmyYIPl3rJ3Z-Ny7RQyFKLO_LXbjmo6k34fgCZ8YRa5bp1ljut9R_fCooOl_bvSyBdDjf0ToivFn1UneTOsOjpmXclQHcrW0iz0dFqqfJNxTva_6p1-LJLFeD3sgjtlhfy2gbzxHDJ0Mo9rI00qo9fNsVCwXFBxfanWQfSxz3CBWsBBvyqGGQuqeYBZOQDtHsHvAaLadmwKNSQp51l52cUaPs1cI7CLuLJqiIfwmLPusMV0iIytevjF24YhVVmLcipAyvsJDi1b7q57W9rtUtz6t--jT5cmhdtqeizHU-BWWOZ-h0Z0A5QAwuecTwwKv76NwB9IwBjqiFth6jvqV-ThabPi_Wa1u9r1clt4kNZQGbd4_QgyrRaDsKSY6Qsf2qCHiZkeI9dBQt4uuMpZj44okT1PH9ilvLzbQH5UesFAi7Jiz8WnkmBKit1bREac3T5GOrPXzWcnDBqbqfqmSdTl91Ek6i_5ZJMr46nzWluaJrsfyRFoiJNgLnMujcuERa97Xgo0phBM2uHPgVfoTteHIKCv03XNyzraSFt3dDUJF9YEikak156cUVxyd10UvUkVGUhlVfsf1ce-qTuKLPXbprzXPktzC8WxCd9sEwgBYqWDs5IM0dSI8K5dM1yOcbKWP8Bv8AYVO4g9PWIum7OoecUm2ctsZtodz_pEM_QSgeeViMU_INcnlJjXsKMQfgoax6ArQ8-f922vziaVStdaaIbVlfBh9Q0A777OLBa2fyIbLupXqTpr-_F8y3Be6jdEUr4C7eYM-MJ2eEn9wPPunh5vmJtZl4gr0vkXdEmOP_fMoHtHUIISe2sMdA9eR0d3oLMiUoqPAt2oVukqERyhJxBCjaCIZIDzzeWBbS0PaePCYl8eiKROnfKXQ3m9N1MAhvlOP3e_oxsJZmV2vJKgMmISYthYThdSf1JnnwPrj_XDm2w-l9eSD9DKlIzsZUBB5xKb2wT5yeYWa4Iuzzmz7l6pf-VqLyX3CHrVm6hdtrGHTZlUF-79w4BWSZCr1hDerKSRvWQ6WxRR31D8A9cRli7YZpAVGpt7C2GQXn8KTWCTgMLKecoIH_qjURSNIqkywIRWXgntGQaPUNvt1tpMON9BLOgB57gFdv4IJ1pVoeSU_1f1M-TDHtMdgxmDrCk9O2okGbxUU-cfLq5RbTbBXSiy5AF_pE6i8gLvk5Ozx4YIMSGBHkKZ-nF6ToVcY2dmHyk9uhdOLN53DajV1QRwaunIq6oCyfHp0SxESfpsX0J7JyvdduyMX0_QY78pph1A6xqGxorbkV2t2NiwtEO3f4lS4ju3cuf5IAHGcEcGfqe93wvvKmkvZlfEK8tJwGkk4KKGvnHAXPBCWtW9LA6KM9AUZ5v6t9slCsbnexZ5xwMgd2A-rwenseKmKi3S9MYaefyjNS0Y5ookwpY4e9OIVW3r_p3TV7PFLnWsgxZ4XynI2GXwOnpTNG1OHZlICYUxVV4nNMYrc7NGJSO9NkO3CVqh9Bw5IcBQVWyclIwmA_0TVBDHe1qpJNNy3wLlIMSaARCSrBToEgD4K1_j7exzbSai-c-r5by21Bg82hpkDnbeGcxf-iGhwS96LYrQeae1IBRTdjwSlSgzxv2F2khHZLfakw3qlnH2o8ciBIXSK0cMUz1u4nkJoBrqE0f0d4RYvXiz74_SQXQ7ReD828AxknIlVlFoHI9g1k_ccHPzxVt6kiptND6cIgT8EmJKbbMHd9dC7N-h2ZmHvMntXLHb0qsshGdjhHZYVvm_0nP5-fjc9G1jH4jt1mDP7DOQ5O058WQC5X7slaWqy2ViwZ2kkxNeo6trQuZnCBH4IwV9CtdW8z5PwlsytH4yhrIvyZ4hebQ3JMttUA4m9iN34MBoGPc63oF-90iZaM15us-eJu18JmRTeUgNUAe4F7Z3QNkF-Nh-8QRTG8HVsi2hIsZKL9_Sq7YfkT2EyAkbEJxRs7nC3Yeb_6_H-nw2_VoirTqh2gy-ulcbNQPceCR7vCL64GHCKZ0NpDylsZL035gxrvDcrj1ZOz7f8z01vgEXIRsMwoBdQPfA_LbAhcbppX48kZyttTfpfUOd4E1qg4oL9ANRp5DICTHHxNnxCKB35Z4Fp5gcuAd4TLcDRIQJu90M-va3ojf5ez3mBRVR6Br8YSRXceAnyMbWHcwo5VOt20DdaghI3uRMgpapK4y_eOe6IvpibdtGqd9pNjZQLTupyDcgXjJZK9_o5O01_dFJKykAQePMfMdSXYysmOSO7Pb2XJx1N86AnWvlm-dfgzHXKdFg6gdhw3Be_h_CPahmA-eBasy3FdIFsb7maJuxY5HGkzsX2YUwo7L1dRsmu1wmXOh16BYa90pqvuk5Ht25LvVlFr1CRLf_V6dFBlAldD-raLFL3YfGlxgSxI0rP_o_hnWXWj-WnQ6U1DQ5528Fc06VVM9lrYPuJc5KnIdrEvw4c6-99jl9N333t0_R8u3O13V01L0nH7b-jVdt0nMQtSQbkz9pKEGJBSsK18sFvtco_g2g0tS54cQ27J1i-1zV0EpNl-fw0II-WwunIBxmjuZK4IgAtUdlPJzKmRG0HIEBF2Az48euGsjcprHoBNMF_sMHPJwuqWKZhwcxY6GJ9t-LLmhqZx9jteru0ylE2EfQDrABxsBpYMbksj-1Pb7qfZ-8PEXyZmsZIyTGl0ygF4i-l8eSB0P3Ij4BHLI0UPf_ZNgpFgBbJ2b8_S76Z6oZFrlK5GrUW4OHuXIM4-CK82jVXUWO9p3xS2QjHmvotdokmm4sWEU7k_5shPFmUAorjT2ux3Jfw2hqZBOY9h1PJ0S5hDHkWZ0SBDh2TqEYLDAj7wHhr-OCEii_XZ_DaSVKcKEtgi42bsuxPrDS5Voi1Wsx6cTCn1A4ru-w1x0RDTedBkfdGMRnwSM2Loh_WWV-dNQ7p6VmfECVVBTnMUtkWVZLu0vcl9kD-1Nx7_E2Nekjrg4ptr5ENhYmZJp8Iee9i3hZe9cX33IOtlsw4IM4ifbHt0KbbWE9uP3KEraFBqFZNWBi9eIcEqwb2tD0SkAIj4gtE9QiMC7We66HEpo9Ki00qwrcdQiNFe5WbfcBGwP9g13g4YwlUkjodOf--6Tm09bQyFAgq2MNk3G0yIASRvlNbat4X1jPNDwTuUfPSKYOlOsMuMRVw-10tUJJMR0ELzosIO_Wp4S5n4GVptRf6Ry5-LFKsn9v82lK1QR-KfUGGuNXOK4sDhQx3j1o5hafaETZQf4Zzfw2sLMSfng2zrnMKBi_RHDJxdXV9U_0X2srMFsxfg1AmduNLcyMmH-FS4WRn2DEvHB1ff80RSK_JpgYqYZK8gKVxkNOB4V6sju0JJW5_TOvPZClO1zSpa5qxPfnMf6wmF6L9RiivQadT2n7CZzx1QCKbaKQbQVcdBJVGPfhLYxeumv1dGpJn1r-3gS9YYRMfYsI5DFL8FWB2d17s2TOzuDWMgMwwxEavPos0REvqruUVx2s2fucT-0M91IwkNd76POjKzM-8axwkJN1rJU9xEYWIAllJXv3ZpB8Vfssx0fjorQCU9LDCvxG774478h84YMeX2QIuskYE1R73CRAbdN8CbolaJkBokxz6tG_p5jkhDBrTo3izULrb6Tr0oBDvuwArBygo_XFX-t4I5cIMgszBYEV8-U7EBJELb3mftJDUJa53pzNJzDJJJTOShxA9N2HbdXo8ruvriR6Odx08qwk2WuvHcUeLb9HZ03sAwzV71BGWYq5pnVX6JloTqne4Qt_AQXQxSx4YhvgIKPwBKAi9bPZHepH7Kxh4_qKjT_eWNXJ-gkK2NCnHo2TzsKseY1AyHgWVHWz5K0t8qJjMI2QkxsEXUjj-17XKbKlOyXCjeRXBTnmMLm31nvwFIlUnLk4PuGhedKxG4xAJ1mhFDhk6QCMFeGVHrJ2pMGhqtMq4SJLGVeY9JqhEnMxwuWo6ZwPLgGSncZPWLTtFI-JFZdIM2coUwe0FFQKpLFXZiGs4kFoNTUV0OTQxTy8It5dndxQttCcjs7ID31sP9f95tk7ceLORp1HCFRMVjZ38yH2lEAPUK34J-qFIt8pUsHOJSC1q7sBMB9jBF-eipImDp7vuO2ysqUYniCxEwwXSk39BzMnJgZvvBcHD95pTqxAj31Hue7Ddv91smy1NxriC-lyDDv4HdpocOdwkNhtcY9MqDysx8gmBocCsW1QSWKWXCfngefEWBRgeKhFiTFGAXokHQrnbQ9GUfTU6MfNfMlD_AAcb7HTi0iEikOiEiPEBXIpm_CtjWm95cAlfloi2UV9ulMdA_SBzMxgwnOPkhBt1GxU5EF5i8u2q2wgjgZRgnLGQsEgRTtE0tt7Uf4Ppb7RQP0W1gn5ZOWPhIjZJxztvLWfJ3v0QGGWng9LkA95_gsQEUE62-Xp6Qfr-ksO-P7iDUhkDfytkA5dykm1JxhGvygsOMBLi5bDkM46lEBJFyC01i1OoUyg92A3Xjft2JWnvXfrLw4Ff8cYo8-CQWmP1oJZpYA-GR1Q4TSiuu6m_Wvi1H0ZUA4myl1K3siyyhS2linl9P12i6eAlKXMTzqjSJM3Neddm6qO1CCKIUWnC-zImYxIYSiKzCnV5n7VUhel-zqDHkOlk4x1ugkvWi9Eu9P6K0izhMKziX7qjVEr7PJ5c8CNN8U5uOeQlx_Dz4mTxdLttOjuw2lPHSH1c5JdOZYyh9J5G29OdOBer5jkeuYZua0ke6W7z3mmamV_XH8fl47GiOfxewysvzpjag4vPluokqPJQ_Y_EhAQsO2LOnVJHva5ebqK9lo29q0a3FdhTkfeppac2Hnqfmn55Cks9nSFJ-Iq69acuecwBvhffDddSKC2qXPa-p2Rd-upgadswJG_tXN_S50XT9nXQiKhnVzS51UnZ07q5A_AiHugh9bO0uA0sOWLvF2L9Vnb7-tzZ3JRhfECRJNsQPjTNcuU_uiFfBYp2EEn48vfGIwP4JJXL28GMmduZZ1hmDwRkzr3O1ZbbAslsOfq2gP02DuD2TpOOCQ9tFDl3TPxU5_xwjJvsUO1UPzC169oUJm1ETtlEzPf2UN0TJmKM_wSk8gvuVJYelJC9oOV1Xmmmvmi6LhWo8JNih8geOXe9-nzdWw495d5rNaObJh4HhYdvqGrBC_3Sc_-G0a0Y5odw',
      resolution: 32,
      category: 'guardians'
    },
    {
      number: 2,
      title_ru: 'Кети • Хранительница Симметрии (32×32)',
      title_en: 'Keti • Guardian of Symmetry (32×32)',
      id: (global.CAT_EXHIBITS && global.CAT_EXHIBITS.keti) ? global.CAT_EXHIBITS.keti.id_32 : 'b32__Ci2waECc2hQ6ZXj_Viv6ydel-8votU_91Vax2up7mLMXq4S9cqBt-xNP3t7aYYDF7DwsvNwA15sW7nm9nBmgbK8rdKKmCJGjZcCJftHfgXntUon3WOelli4nN2gZbWYOBc3V4vA0A19CA5mQwe7sK1cidghOQlm1EyOcVxJo8LxcjtNkSL30PfE58tExURmBYidnqR3Zli6g-wUSvgVTWnPSHtu-IjZQen99Y-z3bhT6ToybivigPENf-sF_WKudI4GMm06ooV1Wr2cgfkS_sfwvlh75QMlBNj_LtlcpmFSVT0snXyB4RVc8oPl4sZ5Z_nJAC5_6p8FyYhFZ-MBF1ZHXt5aGI2l7w2UX6gkQIgZ77WY4C7iXwBd6P_4dOYGTiPx8pB_j1kfJ9NGGXjPpFZpG2H0ObpT2NQF8vOkeDbQsX0hzvKPujRUuxaotuFMtCGB-KHtP5MrrtEpekYpDqX6q74gOwpIs7wzZ2uwDAnnsMA07hdud8oi_1TYALqi3oad7lV5liNOkfRZ0MR6WqvdFCuVkp-NOBdzPRKgYT4-IIJBymWsBZ_7impwGlzUfanV5S91kI-jaN0jmR9tGf01OPNOfzbUEmhI5KZK2xtd9vATPEKUl2CGIuYj6tNIgPfmH8nLMzLj_LD2ylcyRV9zz03Z3ViZsktnCY3e4ZKHVd8SC9kKhIDTAMqfiMh2y3kjZnoDFCSeJtao8mlkwihl-2-veBwTF2WwFcBtD1atg0BqSSTDC6eUa3CK5ZvDTpLwNTXYnGFdrORdsZeTbH9TFC87vmhXhgDeqXmEKMS3FkwvA5ds-NHZ606OMoVpsFu1Tyv_KWDL6FBL8a4Z6Xw3WR_1MCDVVtX09quAAoCwHE5HMSme0IylTL9STTijB3b0BLOvT9LFFBvEpBHVmI5irL_i_gupFz1HslE9P9PxUMJ8gtO494PMD2hjUWDjA6mQAN5O9jyY41LRXFG3uD3ppIAzBLnI__Y__JiOuk3MRcZe026sEUphBP5mhZsBKTLGqU04v_NI17d2HEN7Y7pEK4dt_W_NVfeINxhhnm18bStZ-giuREHYy96_uite9ehJj6YJEvFX0HnAjkLUAAE5gurW5keB3aw0kL2TiLzo6N-DjT2j0upkWg_XX5e96M1yTSK-a6nzQ8rwth42KbNgRyAj8j_AqtG7rUKzsx5JZlg7Wrj5j6IKqGfiJgZ3hgvK-pEUdUww6R5KxTgtQSLzgwQDY3HjR99R5lyvjqpqfbVqslXPH-rFP3jIbYQnxnUMPDifhj56EWXO6h1EMbp2edEoLx3y9HRqU2Z3tEQCq0vghFAMtKUrHRGt-yJvYyzrDlGpa2Pgysm45RVoOTNaJ4tW5onUOBM1giz5qJPYG2lIbdUn5uD4BT3rVgWknZAMm4NCxa-FdW662tw9YyMhG_nuQmu55hyVJ1XISugCZPmJWpk_caM73pTwXX0acgHRd5yoJ_tfUUQPnYIbG3fDgJ_KgqUB4RjsYZztfY_acsvJdyOIE1sQhiS5R-7Bxu15TcDL0YhRo7FmxtxnCwfU_kx4EZP2YgDy1Oa3wTncSO03uDU1xhQ6ctKFyJnD1D9u_jIj2LBSZQJ9FB6QWXO4jbatoXSI4J5MGddlhetac5uWt0pF01-znW6HG7vOezw9-yHb773lsqXCbaQa9GyyCIp7SgGa2XDJ7oEl6UGpwH34SlF_3-9FNVe8zOSt3kgV8AJBGdQUNbAvPjcdISBxUz4O6WbumvH2SVOE5xRUSq6pxeZwR6Q8NKssjRa91Swrq-PJK_NvIXuYjo9NLH2HWRxWvQN5KJ22u0BFEjsXMRs3DvmyDxY2GvlW2sWhZyluA2cGGYiIEI1FBXrS9nz5fUBk8P7YFsrpx13lq26eCErTdvA_2lP9wht4gr15OwGZUGgwn76oExpfDwz4VarJo8GiXDjMq0LONqac8pRv2AGbviRb3LMSWQLJ2gQm9EpC0cQaN_N90_u7cqwntt58jL4Pvk_tep9WngavPC9v_VJ_3SzXMGJuwLZ0prFOoFzgqugRyK-2_r9KsBra6jpxuaR27QDaDocquH0z4TD5ZbFlJzPr9T_irl9eD7QpE6Ptk7cnge57srvKfIi34Db0p-UY_mO-_0rdiGDdVoHv05SISASkjr4aXqadJYLiaxH8sXr0o1m_uvFYqwD_qEN8SNfnkLjbnId9BQ3NcYuOgoaf2uFiHmQTMyOfJRd8B9nNiVOjVBZuAh_95MtvbaYWiDs6PXl4dnH0JHc-sZZCyUoQ0_1J3pZUyEoLLLmy4WsaEnxOO02krfYdXdXpk3ZHjR0mHr8J-S5EBOHeJ8i9qArfwP3SZUHs1tFMyAIzqBvffBVJRTo5v2l8OStWZ-dmE5c099UWv9HBDrzfgg8PRZaeJahuJms1734d6NZMXr76kn_g90wjwj8P8FWiKsAfAAOYeHplPbWQvuP-dZhgpXqR-dX58P2PwAV8i6D5l5z9iGPfM7np4sBNRjf79D8i6B1PgmLNBSVP1_nPYc37b4mUUETPkRfyZ1gaCyXE14cIuF9nzFJXFfE0rLBsqzlJVKWosG5ygK_mxfTUT_N2Gc4AJ3sKgY7w8aFNn5uvtGif68-3yUmuurqV13URM4IY8LMUWuHRngH97-55rZvP-L91gNK_LUi2L0m1LwaReFof0uq9LMAG3NtPiP3Wk4OxGwz1UVce1lg6Rhl9c7uMM1RprSZlvl_H9qBcvlnmNGmFDh46s-5DyxNg-1bdyAXUgZoY7LzSsg-MKLU5ptpXIGbR3tv_BQQmJ4iSJKcjw56Vexrvk3kxKqwG4rng5vf_fZIjQSgZIFWPgh6fSH_3Fua6BaiCdO0qaTsr6z8d_pQ9qZpe4zvkks2Igo5SbfGoxEcm94kWq_odBu0K5F_5eVQI-z8kk_34igr_s26nK-U6DkrnunqqEwVFrETFCJzYzita42fA0WV9P_d8mJehIvquyGGxpAwRWy9T-dtU4Oa64PyMra-aPT2r0vzY_nRKEJ58rErapPRtZCNpAtQhfkvHchgcDs5IdlE49fTcSwpzSrdtbgxlm2Gba51Wr-IAk_dKROOCmmRKbHOe1H0AtZP9zVD07dfcAzF3x5lhSW7859bkU2Gkn8f3k7zX2Yc0pKY5pq9LdUaaae7ALl2E1tpkPwzbVXWYFN3R4kvAwrjLKsQtlpTXl6ZntYvmw3sS3frns9zayzQtCzNmbafZkPJ6BUEgYPOdvtdwHTLneGHi8zpRLlH_jFeEHt8oLJugeVvZNKw-jhGHcbdaQr95X8-o7FQSIrzvC8GtbjO37isNjmEbQ6NqgBGTcXLM_FwFPFu7Npn_dpGeS0MBPT5lllqX3dS6F5OpxGX6sv6Iba2gMzPj6jy9_S8FCzlpXOwKBCrz6gdVyWUijw4zV-ds8AVIg2Y4k287DFDKC0fk1-spmZ0sTP3D-jQ3RM8HTic0As8FXAOWzhMpn2aA2QAFOexAAQ9568IVJQr9CSV1MGPpTNDNKyuzEQu2EsvpuX-WMe4GDs9MolTGTWEcI3su9_DBFTHxOsBwR5BnPxQ7i4CnOG02HbIijYzIMcyIb9c08UHrgJu_ZJKmUXVIovlIpN1jOXCRwX8mjR7YyRf5aiW-tRT7cKmmEi-DIy2p2PivFQcIUbYDz89wzg316blkwKAc-sEUetYmfwlwgYIhc9F-I3sA5N4B8rbDkbKbcP6F9l2cB8LcNHw_8_6c-S7hypuTwj-h6A7LWgPVvrdpH_5UO-qX_lOc8PZhGca_wbvy59Mu6-3NT781Odt11NgMidZwBDPXyMtAJlRb4XwNG0djH8qJnsd1W97-TFOHYrVlv19wo68jEjZMXC4_SrgErN_wcdTYmOlyx6SeEFnKswjCixsS8sJSYBfFYOjFwTdtEbaowmalrxr0ywsqqZXvnvKxTLJ1F33asKGVLpbG5KdAW5yVi9-jYAWCSjLgHu0upl2Fsx8KxJXLgZGqGrvlxC6y_Aomo4YEpdeC-rzMX5t8ixRHGhgkCwhxqDPnYFBh2CiZlOFIvaxZtlGHYKW6T1Cnb1vCrgJ3mMl67o-2xkEu6X2Y-KYjo2qqJwIuu4WDq-4fuUMEXt12ml3FLuTGvpIBmvwOJq59CmoQ7u6WiW7uR1u6QA0IQNPiat1zZkuv1s67p1JAHf3msprG82G-QI6w_HgmpAdcq0vVZUBtGldcHykOF3NTbktjz5DZ8-D2IPaFf7L0wqShPIxcI79lHSiSQ-_j0iwnx4Aa7Gzl0X4w9dXlbFUYaP0f-9sVicLC8WrNqydqN7yIm-gr15aGLSkyhSuEUODC6qS-h6t5SNATW1NJU54O4qN4gciMS8aLQra3o9RSlMcaixmfxjcVTowJGDASfTV0XNKmRUG6pZxCcs0uD86D5_V7Pegvj_eRuiDhZKf_sSBL20tZTGPsV2NKtBDKWYSal78Y_bFDKp02LH-qcHnMUkoChNsNyfy4Y3hyKNeK2V_vfHq6NEk5ehFrpQAgpL4Lcog8V_iSaSvyi2riY51MMDk0JbYBxo6QFuzUkCZ5oRFx8rZ8xAk07FvGY3WO0OcYSN667y4kxcGH6B8aNjJTmbJg3fF4Y41RX8AYipSv0oYLAF1rMgE3LlSl6hBqgatVIONNTkoHgF9xD3Z1DJv48TLl3WtHCYEqLV_Yeme_udsQmqu0gPblaxmO2g49ZkWh7rb5fEAZLWxSzRQ0PZo8b2pJfvhCJ1TynEXJvu3awDt7LTw4-mviAaPB4riMPE7KmskPFrEtWTaHW95LcoiZql5x_l0expml73_5XHxm_ZhqcilJ2GCQAMgCdJ7n1w6DjVwIqBBWscQlGKycXvEc1CFZ7y-YwaKAd6pUeSvN5u-EeHnQ5oJGsHShTSLTK94FbO9FYUSQifntctxy9fz-uNa8eQa-KK1VefHvSppocqTJdXw-g8847pss2HBtpp3ldvLzo3-Ky8klZTSPaRkfC0LJ_IuNDXB642DHRR9hwWTM83-ErGLuMUib4GLJjf2nkmAj9MiCbIkyQ_WNjkEd3eVwvPuiGggnC_dECfsqSJdyFcvv0ZmaDgMo4SmqRdb8TTVPE8Pp1qmfaHl-HBw_npkbrzJ_W_fKTDTF0AWIgGoHl493XBkPC5JiNZgcX1D-9KgDvDJNJ86-2OcxNL7EP6lv3aFyupFhZcayTUZFJYDar9sXfVKhXSce5sU1m--1xAyWdSyQ5Ecaj1INRTOU1aF0c71yozFTxZVAe_5CkLpzUoQVV5BFgozz1kLQkhGkIVF07PkyGZPbcjmd7phxhykqTHhx2_XjktZIMxUFKPPLtFG22HRhms7SqKhwkbLNv4OPgYePimlSnB4imKv6XHAwSmbKmH7Tx1hQp1fsc_i0uC1PN5vCxzJly9bPekuFXB3Vhw2SQCIzl3Le0p7Q0TQ13oQGkg',
      resolution: 32,
      category: 'guardians'
    },
    {
      number: 3,
      title_ru: 'Муся • Детализированный портрет (64×64)',
      title_en: 'Musya • Enhanced Portrait (64×64)',
      id: (global.CAT_EXHIBITS && global.CAT_EXHIBITS.musya) ? global.CAT_EXHIBITS.musya.id_64 : '',
      resolution: 64,
      category: 'guardians'
    },
    {
      number: 4,
      title_ru: 'Кети • Детализированный портрет (64×64)',
      title_en: 'Keti • Enhanced Portrait (64×64)',
      id: (global.CAT_EXHIBITS && global.CAT_EXHIBITS.keti) ? global.CAT_EXHIBITS.keti.id_64 : '',
      resolution: 64,
      category: 'guardians'
    }
  ];

  function getCustomExhibits() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function setCustomExhibits(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  function formatExhibitNumber(num) {
    const n = Math.max(1, Math.floor(Number(num) || 1));
    return `EXHIBIT #${String(n).padStart(9, '0')}`;
  }

  function parseExhibitNumber(inputStr) {
    if (typeof inputStr === 'number') {
      return (Number.isFinite(inputStr) && inputStr >= 1) ? Math.floor(inputStr) : null;
    }
    if (typeof inputStr !== 'string') return null;

    const clean = inputStr.trim();
    if (!clean) return null;

    // Check if input looks like a full Base64 ID (long or starts with prefix)
    if (clean.length > 50 || clean.startsWith('b32_') || clean.startsWith('b64_') || clean.startsWith('ig32_') || clean.startsWith('32_') || clean.startsWith('64_')) {
      return null;
    }

    // Extract digits
    const digitsOnly = clean.replace(/[^\d]/g, '');
    if (!digitsOnly) return null;

    const num = parseInt(digitsOnly, 10);
    return (Number.isFinite(num) && num >= 1) ? num : null;
  }

  function getAllExhibits() {
    const custom = getCustomExhibits();
    const map = new Map();

    // 1. Add seeds
    SEED_EXHIBITS.forEach(ex => {
      if (ex.id) map.set(ex.number, { ...ex });
    });

    // 2. Add custom
    custom.forEach(ex => {
      map.set(ex.number, { ...ex });
    });

    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  }

  function findByNumber(numOrStr) {
    const num = parseExhibitNumber(numOrStr);
    if (!num) return null;

    const all = getAllExhibits();
    return all.find(e => e.number === num) || null;
  }

  function findById(idStr) {
    if (!idStr) return null;
    const cleanId = idStr.trim();
    const all = getAllExhibits();
    return all.find(e => e.id === cleanId) || null;
  }

  function saveExhibit(exhibit) {
    if (!exhibit || !exhibit.id) {
      throw new Error('Exhibit must have a valid ID.');
    }

    const all = getAllExhibits();
    let num = exhibit.number;

    if (!num) {
      const maxNum = all.reduce((max, e) => Math.max(max, e.number), 0);
      num = maxNum + 1;
    }

    const newEntry = {
      number: num,
      title_ru: exhibit.title_ru || `Экспонат #${String(num).padStart(9, '0')}`,
      title_en: exhibit.title_en || `Exhibit #${String(num).padStart(9, '0')}`,
      id: exhibit.id.trim(),
      resolution: exhibit.resolution || 32,
      savedAt: Date.now()
    };

    const custom = getCustomExhibits().filter(e => e.number !== num);
    custom.push(newEntry);
    setCustomExhibits(custom);

    return newEntry;
  }

  // Generate canonical stepping exhibits from seed 1 if not present
  function ensureDefaultSteppingRange(maxSeed = 12) {
    const all = getAllExhibits();
    const musya = all.find(e => e.number === 1);
    if (!musya || !global.InfiniteGalleryGenerator || !musya.id) return;

    let hasNew = false;
    const custom = getCustomExhibits();

    for (let i = 5; i <= maxSeed; i++) {
      if (!all.find(e => e.number === i)) {
        try {
          const stepId = global.InfiniteGalleryGenerator.stepAddress(musya.id, i - 1);
          custom.push({
            number: i,
            title_ru: `Канонический экспонат Вавилона #${String(i).padStart(9, '0')}`,
            title_en: `Canonical Babel Exhibit #${String(i).padStart(9, '0')}`,
            id: stepId,
            resolution: 32,
            category: 'canonical'
          });
          hasNew = true;
        } catch (e) {
          break;
        }
      }
    }

    if (hasNew) {
      setCustomExhibits(custom);
    }
  }

  // Pre-seed on load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(ensureDefaultSteppingRange, 100);
  });

  const InfiniteGalleryCatalog = {
    formatExhibitNumber,
    parseExhibitNumber,
    getAllExhibits,
    findByNumber,
    findById,
    saveExhibit
  };

  global.InfiniteGalleryCatalog = InfiniteGalleryCatalog;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = InfiniteGalleryCatalog;
  }
})(typeof window !== 'undefined' ? window : globalThis);
