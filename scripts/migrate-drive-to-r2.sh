#!/usr/bin/env bash
# ============================================================================
# Ibn Baydoah Platform — Google Drive -> Cloudflare R2 Migration Script
# Transfers all 44 Google Drive course folders to clean R2 CDN prefixes
# and exports r2-manifest.json for one-click import in the Admin Dashboard.
#
# Prerequisites:
#   1. Install rclone: https://rclone.org/install/
#   2. Configure Google Drive remote:  rclone config  (name it: gdrive)
#   3. Configure Cloudflare R2 remote: rclone config  (name it: r2, S3 -> Cloudflare)
#   4. Run: chmod +x scripts/migrate-drive-to-r2.sh && ./scripts/migrate-drive-to-r2.sh
# ============================================================================

set -euo pipefail

GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"
R2_REMOTE="${R2_REMOTE:-r2}"
R2_BUCKET="${R2_BUCKET:-ibn-baydoah-media}"
TRANSFERS="${TRANSFERS:-6}"
CHECKERS="${CHECKERS:-8}"
SHARED_FLAG="${SHARED_FLAG:-}" # Set SHARED_FLAG="--drive-shared-with-me" if folders are shared with you

echo "=================================================================="
echo " Ibn Baydoah Media Sync: ${GDRIVE_REMOTE} -> ${R2_REMOTE}:${R2_BUCKET}/courses"
echo " Total Mapped Course Folders: 44"
echo "=================================================================="

sync_folder() {
  local prefix="$1"
  local folder_id="$2"
  local title="$3"
  echo ""
  echo ">>> [$prefix] $title"
  rclone copy "${GDRIVE_REMOTE}:" "${R2_REMOTE}:${R2_BUCKET}/courses/${prefix}" \
    --drive-root-folder-id="${folder_id}" \
    --transfers="${TRANSFERS}" \
    --checkers="${CHECKERS}" \
    --ignore-existing \
    --progress \
    ${SHARED_FLAG}
}

# Optional: Uncomment below if you prefer syncing the combined root folder directly:
# rclone copy "${GDRIVE_REMOTE}:" "${R2_REMOTE}:${R2_BUCKET}/raw-root" --drive-root-folder-id="1HCDWJKIcbfLnecitYRRUQuYJ633Dci7a" --progress

sync_folder "fadl-ilm-al-salaf" "1WLiKz9cdu1NVgwAJRaejzDvIvmgKyX1d" "01 - كلمات مختصرة من كتاب بيان فضل علم السلف على علم الخلف"
sync_folder "hilyat-talib-al-ilm" "1VdRz_Jmt26p9LLIeAKZwc5nJPWJ4t3b1" "02 - تلخيص كتاب حلية طالب العلم للشيخ بكر بن عبدالله أبو زيد"
sync_folder "al-durrah-al-thaminah" "13e7XlDeJff4V22axJAtJNcdamaFWHIaO" "03 - التعليق على قصيدة الدرة الثمينة في حلية طالب العلم الناجح"
sync_folder "nawaqid-al-islam" "1vckOF1SPV2eUk5C2yFWW9faAddwKvyW4" "04 - شرح نواقض الإسلام للشيخ محمد بن عبدالوهاب"
sync_folder "thalathat-al-usul" "1AnGgfCAnB4VWuN_oll2xbCqzQrXqVIBI" "05 - شرح الثلاثة الأصول للشيخ محمد بن عبدالوهاب"
sync_folder "al-haiyyah" "1bZ-jrJ3yTDSq69ZmOq6QzZwEmmZDBm5_" "06 - شرح منظومة الحائية لابن أبي داود السجستاني"
sync_folder "al-raiyyah-fil-sunnah" "1_MFkw0MuYblaT3Ar6BL4aJszOPxpT--7" "07 - شرح منظومة الرائية في السنة للإمام الزنجاني"
sync_folder "shurut-la-ilaha-illa-allah" "1zbsY2vOArfozbZlFtFBscsaALUSNjG5N" "08 - شروط لا إله إلا الله"
sync_folder "al-arbain-al-nawawiyyah" "11iteXVvw-7TunSHq_C8mKrvXyHCQI7um" "09 - شرح الأربعين النووية للإمام النووي"
sync_folder "tafsir-518-567" "1P1lVcXNXbbgDUiPt89RM8DFPTFw7FscL" "10 - تفسير القرآن الكريم (صفحة 518-567)"
sync_folder "tafsir-al-muminun" "1xNOqgsukJraeCtPWeZmky5os70E4yArq" "11 - تفسير سورة المؤمنون"
sync_folder "ayat-al-siyam" "1YS_801wPMaUMadnu_YTh0rggEgdIqCeP" "12 - آيات الصيام: تفسير وأحكام"
sync_folder "fusul-usul-al-tafsir" "1VY92wuabcYS3iF8ZweaVV0fJT7t0-5V3" "13 - تلخيص كتاب فصول في أصول التفسير للدكتور مساعد الطيار"
sync_folder "al-sayr-ila-allah" "15oM306VbxFaMkyBVXrv_MKdXrwKtc62N" "14 - شرح منظومة في السير إلى الله والدار الآخرة للعلامة السعدي"
sync_folder "qawaid-al-nahw-al-asasiyyah" "1C0H0-CmR2jw_j2UNK-71sDnFDcItgTXA" "15 - قواعد النحو الأساسية"
sync_folder "al-ajurrumiyyah-beginner" "1RKSR9hvzq_cvVrzOtMBJSa6D2kqaxLBW" "16 - شرح المقدمة الآجرومية للمبتدئين"
sync_folder "al-ajurrumiyyah-intermediate" "15jnMaAILRm-48Gb7MZ1cVjtBHIE4Z-VN" "17 - تعليقات على المقدمة الآجرومية للمتوسطين"
sync_folder "al-tuhfah-al-saniyyah" "11tjKCVGYXZ-CS-M0MVBEtW3-WH5qK7Nk" "18 - شرح تحفة السنية في شرح الآجرومية"
sync_folder "alfiyyat-ibn-malik" "1L_OcPRTIVImw2xL5yGvuqiQ6DxSC61Q8" "19 - شرح ألفية ابن مالك - شرح إجمالي في فك عبارات النظم"
sync_folder "bina-al-afal" "1CS2suT3TfhduWBI0RoUCUDgfoCxs9ltW" "20 - شرح متن بناء الأفعال في علم الصرف"
sync_folder "taliqat-al-bina" "1KOfiGG_aP_uBr-EB1CQ_BupaaLdQm_gS" "21 - تعليقات ميسرة على متن البناء"
sync_folder "shadha-al-arf" "13NsEkVNSLAbgXFj-O8_W279pNED-T21l" "22 - شرح شذا العرف في فن الصرف"
sync_folder "lamiyyat-al-afal" "1_z8qxYxoGH_iq6dz3Iv-52kY3J8rhVIG" "23 - شرح لامية الأفعال في علم الصرف"
sync_folder "lamiyyat-ibn-al-wardi-beginner" "1PEPlSbWYyZmZ23Ce4dQc_68a0r1wcn7x" "24 - شرح لامية ابن الوردي للمبتدئين"
sync_folder "lamiyyat-ibn-al-wardi-intermediate" "1E7B1gtjSVHGsdHQuCdh-_DTevachMnUp" "25 - شرح لامية ابن الوردي للمتوسطين"
sync_folder "taiyyat-al-ilbiri" "16jieByxzzm1DVDzTgmpAxgTMzs_DkuiW" "26 - شرح منظومة التائية لأبي إسحاق الإلبيري"
sync_folder "unwan-al-hikam" "1L3G6e1gZcEkatFmUOWA_pTAei1lwWLyY" "27 - شرح عنوان الحكم لأبي الفتح البستي"
sync_folder "al-maqtuat-al-adabiyyah" "1vlRUGbAoMAFJ_A7SLTS2vjbrVTmGGILf" "28 - شرح المقطوعات الأدبية للشيخ آدم عبدالله الإلوري"
sync_folder "maqsurat-ibn-durayd-intermediate" "1Zx7nEEm3EceMt2Sw0P4ZBmA9qC7_CHC1" "29 - شرح مقصورة ابن دريد - شرح متوسط"
sync_folder "maqsurat-ibn-durayd-advanced" "18zUYX_DwXxNO2vMmUg2MibIIm1xBRRRf" "30 - شرح مقصورة ابن دريد - شرح مطول"
sync_folder "muthallathat-qutrub" "1sDeiygjnorO5pt-MLWy8ciegwyJJFODO" "31 - شرح مثلثات قطرب لابن العماد الحنبلي"
sync_folder "fan-al-maqamat" "177YzhgKMnKlbbD2JpnuDqsMvG6gnIqhX" "32 - المدخل إلى فن المقامات ومقامات الحريري أنموذجا"
sync_folder "durus-al-lughah-1" "1FJMwRrDfxonvf3Tx9y1dOY1LokiKko9h" "33 - شرح دروس اللغة العربية - الجزء الأول"
sync_folder "durus-al-lughah-2" "1g7eaV8R8unK7cRXcTYPZ3Wo5SKLtx9sC" "34 - شرح دروس اللغة العربية - الجزء الثاني"
sync_folder "ilm-al-dawah" "1ZtFn-_dYOmcD01TdLeIn4XwhDzI1u-dQ" "35 - علم الدعوة إلى الله تعالى"
sync_folder "qasidat-idha-sahha-al-hadith" "1I2aoTOUptPFTmSWecHfEWsoFd-ecGvm9" "36 - التعليق على قصيدة إذا صح الحديث فهو مذهبي"
sync_folder "qasidat-ashab-al-sittah" "1fZvpG1Zr2puozhlkijjEa5gogazF70yU" "37 - التعليق على قصيدة أسماء أصحاب الكتب الستة ووفياتهم"
sync_folder "qasidat-ala-inna-al-taallum" "1sd5rhyycWEs69nTG4x1ilibot_y1atYW" "38 - التعليق على قصيدة ألا إن التعلم كل حال"
sync_folder "qasidat-al-khuzaai" "1Qvwy2u8fJ7FcQvK4osKZEGY5xASqK7il" "39 - التعليق على قصيدة محمد بن بشير الخزاعي"
sync_folder "tafsir-al-fatihah" "1gEmXd7tu3fa18sSqnkzjErqKZkG3QJQi" "40 - تفسير سورة الفاتحة"
sync_folder "ilm-al-bayan-madkhal" "11WKJDAbdLpcTzQxNDzJGd-7Ke_RyujcM" "41 - علم البيان: تاريخه والمدخل إليه"
sync_folder "tarikh-ulum-al-balaghah" "13yRCucWgAxtsRbbjzmmYhWxvWuMTO18X" "42 - تاريخ علوم البلاغة عامة وعلم البيان خاصة"
sync_folder "mabadi-ilm-al-nahw" "1F-oXAU6CT_9tjjEqHykOZynRxrf_-BVt" "43 - مبادئ علم النحو العشرة بالتفصيل"
sync_folder "tasrif-al-izzi" "1nbd1YUIeTT0ifAkA-hP-Avg3hoG4yD5e" "44 - شرح تصريف العزي"

echo ""
echo "=================================================================="
echo " Generating r2-manifest.json for Admin Dashboard Import..."
echo "=================================================================="
rclone lsjson -R --files-only "${R2_REMOTE}:${R2_BUCKET}/courses" > r2-manifest.json
echo "Done! Generated $(pwd)/r2-manifest.json."
echo "Next steps:"
echo "  1. Open Admin Dashboard -> Bulk Import & R2 Sync"
echo "  2. Click [Scan & Sync R2 Bucket] (if R2 env vars are set), OR upload r2-manifest.json."
